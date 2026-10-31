import { useRef, useState, type FormEvent } from 'react';
import { useGroupStore } from '../store/groupStore';

/** Add-member logic shared by the inline desktop form and the phone sheet. */
export function useAddMember() {
  const { addMember } = useGroupStore();
  const [name, setNameState] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastAdded, setLastAdded] = useState<string | null>(null);
  // i18n key of the last failure; cleared on the next edit or a successful add.
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const setName = (value: string) => {
    setNameState(value);
    setError(null);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    setError(null);
    try {
      await addMember(trimmed);
      setNameState('');
      setLastAdded(trimmed);
    } catch {
      // Keep the typed name for a retry; don't leave an earlier success announced.
      setLastAdded(null);
      setError('member.addFailed');
    } finally {
      setLoading(false);
      // Stay in the field so several members can be added in a row.
      inputRef.current?.focus();
    }
  };

  return { name, setName, loading, submit, lastAdded, error, inputRef };
}
