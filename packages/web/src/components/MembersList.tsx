import { useState } from 'react';
import { useGroupStore } from '../store/groupStore';

interface MembersListProps {
  canEdit: boolean;
}

export function MembersList({ canEdit }: MembersListProps) {
  const { members, addMember, updateMember, deleteMember, expenses } = useGroupStore();
  
  const [newMemberName, setNewMemberName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim() || loading) return;
    
    setLoading(true);
    try {
      await addMember(newMemberName.trim());
      setNewMemberName('');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateMember = async (memberId: string) => {
    if (!editingName.trim() || loading) return;
    
    setLoading(true);
    try {
      await updateMember(memberId, editingName.trim());
      setEditingId(null);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMember = async (memberId: string) => {
    // Check if member is used in any expense
    const isUsed = expenses.some(
      e => e.payers.some(p => p.memberId === memberId) ||
           e.splits.some(s => s.memberId === memberId)
    );
    
    if (isUsed) {
      alert('Cannot delete a member who is part of an expense');
      return;
    }
    
    if (!confirm('Are you sure you want to delete this member?')) return;
    
    setLoading(true);
    try {
      await deleteMember(memberId);
    } finally {
      setLoading(false);
    }
  };

  const startEditing = (memberId: string, name: string) => {
    setEditingId(memberId);
    setEditingName(name);
  };

  return (
    <div>
      {canEdit && (
        <form onSubmit={handleAddMember} className="flex gap-2 mb-4">
          <input
            type="text"
            className="input"
            placeholder="Add new member..."
            value={newMemberName}
            onChange={(e) => setNewMemberName(e.target.value)}
          />
          <button type="submit" className="btn btn-primary" disabled={loading}>
            Add
          </button>
        </form>
      )}

      {members.length === 0 ? (
        <div className="empty-state">
          <p>No members yet</p>
          {canEdit && <p className="text-sm">Add members to start splitting expenses</p>}
        </div>
      ) : (
        <ul className="list">
          {members.map((member) => (
            <li key={member.id} className="list-item">
              {editingId === member.id ? (
                <div className="flex gap-2 w-full">
                  <input
                    type="text"
                    className="input"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    autoFocus
                  />
                  <button 
                    className="btn btn-sm btn-primary"
                    onClick={() => handleUpdateMember(member.id)}
                    disabled={loading}
                  >
                    Save
                  </button>
                  <button 
                    className="btn btn-sm btn-secondary"
                    onClick={() => setEditingId(null)}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <>
                  <span>{member.name}</span>
                  {canEdit && (
                    <div className="flex gap-1">
                      <button
                        className="btn btn-sm btn-secondary"
                        onClick={() => startEditing(member.id, member.name)}
                      >
                        Edit
                      </button>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => handleDeleteMember(member.id)}
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
