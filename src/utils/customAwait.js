export const handleCustomAwait = async (
  awaitType,
  then,
  setFormState,
  setValue,
  values,
) => {
  setFormState('loadingStepper');
  try {
    await awaitType.func(...awaitType.args, setValue, values);
    if (typeof then === 'function') {
      setFormState('');
      then();
    } else {
      setFormState('');
    }
  } catch (error) {
    console.error(error);
    setFormState('error');
  }
};