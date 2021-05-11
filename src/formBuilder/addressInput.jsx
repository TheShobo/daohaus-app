import React, { useEffect, useState } from 'react';
import { Spinner } from '@chakra-ui/react';

import { useDao } from '../contexts/DaoContext';
import GenericSelect from './genericSelect';
import GenericInput from './genericInput';
import { ModButton } from './staticElements';

import { handleGetProfile } from '../utils/3box';
import { isEthAddress, truncateAddr } from '../utils/general';
import { getActiveMembers } from '../utils/dao';
import { lookupENS } from '../utils/ens';

const AddressInput = props => {
  const { name, localForm } = props;
  const [textMode, setTextMode] = useState(true);
  const [userAddresses, setAddresses] = useState([]);
  const [helperText, setHelperText] = useState('Use ETH address or ENS');
  const { daoMembers } = useDao();

  const { setValue } = localForm;

  useEffect(async () => {
    let shouldSet = true;
    if (daoMembers) {
      const memberProfiles = Promise.all(
        getActiveMembers(daoMembers)?.map(async member => {
          const profile = await handleGetProfile(member.memberAddress);
          if (profile?.status !== 'error') {
            return { name: profile.name, value: member.memberAddress };
          }
          return {
            name: truncateAddr(member.memberAddress),
            value: member.memberAddress,
          };
        }),
      );
      if (shouldSet) {
        setAddresses(await memberProfiles);
      }
    }
    return () => {
      shouldSet = false;
    };
  }, [daoMembers]);

  const switchElement = () => {
    setTextMode(prevState => !prevState);
  };

  const handleLookupENS = async ens => {
    setHelperText(<Spinner />);
    const result = await lookupENS(ens);
    if (result) {
      setHelperText(ens);
      setValue(name, result);
    } else {
      setHelperText('No ENS Set');
    }
  };

  const checkApplicant = e => {
    if (e?.target?.value == null) return;
    const input = e.target.value;
    if (isEthAddress(input)) {
      setHelperText('Valid Address');
    } else if (input.endsWith('.eth')) {
      handleLookupENS(input);
    } else {
      setHelperText('Use ETH address or ENS');
    }
  };

  return (
    <>
      {textMode ? (
        <GenericInput
          {...props}
          btn={<ModButton label='Members' callback={switchElement} />}
          onChange={checkApplicant}
          helperText={helperText}
        />
      ) : (
        <GenericSelect
          {...props}
          placeholder='Select an Address'
          options={userAddresses}
          btn={<ModButton label='Address' callback={switchElement} />}
        />
      )}
    </>
  );
};

export default AddressInput;
