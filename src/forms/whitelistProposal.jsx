import React, { useState, useEffect } from 'react';
import { RiErrorWarningLine } from 'react-icons/ri';
import { useForm } from 'react-hook-form';
import { useParams } from 'react-router-dom';
import {
  Button,
  FormLabel,
  FormControl,
  Flex,
  Input,
  Icon,
  Box,
} from '@chakra-ui/react';

import { useDao } from '../contexts/DaoContext';
import { useInjectedProvider } from '../contexts/InjectedProviderContext';
import { useMetaData } from '../contexts/MetaDataContext';
import { useOverlay } from '../contexts/OverlayContext';
import { useTX } from '../contexts/TXContext';
import { useUser } from '../contexts/UserContext';
import useCanInteract from '../hooks/useCanInteract';
import { chainByID } from '../utils/chain';
import DetailsFields from './detailFields';
import TextBox from '../components/TextBox';
import { createPoll } from '../services/pollService';
import { MolochService } from '../services/molochService';
import { createForumTopic } from '../utils/discourse';
import { createHash, detailsToJSON } from '../utils/general';

const WhitelistProposalForm = () => {
  const { canInteract } = useCanInteract({
    checklist: ['isConnected', 'isSameChain'],
  });

  const { daochain, daoid } = useParams();
  const {
    address,
    injectedProvider,
    requestWallet,
    injectedChain,
  } = useInjectedProvider();
  const { cachePoll, resolvePoll } = useUser();
  const { daoMetaData } = useMetaData();
  const { daoOverview } = useDao();
  const {
    errorToast,
    successToast,
    setProposalModal,
    setTxInfoModal,
  } = useOverlay();
  const { refreshDao } = useTX();
  const [currentError, setCurrentError] = useState(null);
  const [loading, setLoading] = useState(false);

  const { handleSubmit, errors, register } = useForm();

  useEffect(() => {
    if (Object.keys(errors).length > 0) {
      const newE = Object.keys(errors)[0];
      setCurrentError({
        field: newE,
        ...errors[newE],
      });
    } else {
      setCurrentError(null);
    }
  }, [errors]);

  // TODO check link is a valid link

  console.log(address);

  const onSubmit = async values => {
    const now = (new Date().getTime() / 1000).toFixed();
    const hash = createHash();
    const details = detailsToJSON({ ...values, hash });
    const args = [values.tokenAddress, details];
    console.log('details :>> ', details);
    try {
      const poll = createPoll({ action: 'submitWhitelistProposal', cachePoll })(
        {
          daoID: daoid,
          chainID: daochain,
          hash,
          actions: {
            onError: (error, txHash) => {
              errorToast({
                title: 'There was an error.',
              });
              resolvePoll(txHash);
              console.error(`Could not find a matching proposal: ${error}`);
            },
            onSuccess: txHash => {
              successToast({
                title: 'Whitelist Proposal Submitted to the Dao!',
              });
              refreshDao();
              resolvePoll(txHash);
              createForumTopic({
                chainID: daochain,
                daoID: daoid,
                afterTime: now,
                proposalType: 'Whitelist Proposal',
                values,
                applicant: address,
                daoMetaData,
              });
            },
          },
        },
      );
      const onTxHash = () => {
        setProposalModal(false);
        setTxInfoModal(true);
      };
      console.log(poll);
      MolochService({
        web3: injectedProvider,
        daoAddress: daoid,
        chainID: daochain,
        version: daoOverview.version,
      })('submitWhitelistProposal')({
        args,
        address,
        poll,
        onTxHash,
      });
    } catch (err) {
      setLoading(false);
      console.error('error: ', err);
      errorToast({
        title: 'There was an error.',
      });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <FormControl
        isInvalid={errors.name}
        display='flex'
        flexDirection='row'
        justifyContent='space-between'
        mb={5}
        flexWrap='wrap'
      >
        <Box w={['100%', null, '50%']} pr={[0, null, 5]}>
          <DetailsFields register={register} />
        </Box>
        <Box w={['100%', null, '50%']}>
          <TextBox as={FormLabel} size='xs' htmlFor='tokenAddress' mb={2}>
            Token Address
          </TextBox>
          <Input name='tokenAddress' placeholder='0x' mb={3} ref={register} />
        </Box>
      </FormControl>
      <Flex justify='flex-end' align='center' h='60px'>
        {currentError && (
          <Box color='secondary.300' fontSize='m' mr={5}>
            <Icon as={RiErrorWarningLine} color='secondary.300' mr={2} />
            {currentError.message}
          </Box>
        )}
        <Box>
          {canInteract ? (
            <Button
              type='submit'
              loadingText='Submitting'
              isLoading={loading}
              isDisabled={loading}
            >
              Submit
            </Button>
          ) : (
            <Button
              onClick={requestWallet}
              isDisabled={injectedChain && daochain !== injectedChain?.chainId}
            >
              {`Connect
              ${
                injectedChain && daochain !== injectedChain?.chainId
                  ? `to ${chainByID(daochain).name}`
                  : 'Wallet'
              }`}
            </Button>
          )}
        </Box>
      </Flex>
    </form>
  );
};

export default WhitelistProposalForm;
