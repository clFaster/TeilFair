import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useGroupStore } from '../store/groupStore';
import { ThemeSettings } from '../components/ThemeSettings';

export function HomePage() {
  const navigate = useNavigate();
  const { createGroup, loadGroup, recentGroups, removeFromRecent, loading } = useGroupStore();
  
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [currency, setCurrency] = useState('EUR');
  const [joinLink, setJoinLink] = useState('');
  const [error, setError] = useState('');

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) return;
    
    try {
      const group = await createGroup(groupName.trim(), currency);
      navigate(`/g/${group.id}?t=${group.writeToken}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create group');
    }
  };

  const handleJoinGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      // Parse the link to extract groupId and token
      const url = new URL(joinLink);
      const pathMatch = url.pathname.match(/\/g\/([a-f0-9-]+)/i);
      const token = url.searchParams.get('t');
      
      if (!pathMatch || !token) {
        setError('Invalid group link');
        return;
      }
      
      const groupId = pathMatch[1];
      const success = await loadGroup(groupId, token);
      
      if (success) {
        navigate(`/g/${groupId}?t=${token}`);
      } else {
        setError('Could not access group. Invalid link or token.');
      }
    } catch {
      setError('Invalid link format');
    }
  };

  const handleOpenRecent = async (groupId: string, token: string) => {
    const success = await loadGroup(groupId, token);
    if (success) {
      navigate(`/g/${groupId}?t=${token}`);
    } else {
      // Token no longer valid, remove from recent
      removeFromRecent(groupId);
      setError('This group is no longer accessible');
    }
  };

  return (
    <div>
      <header className="header">
        <div className="header-content">
          <Link to="/" className="logo">TeilFair</Link>
        </div>
      </header>
      
      <div className="container">
        <div className="card text-center">
          <h1 className="mb-2">Split expenses fairly</h1>
          <p className="text-muted mb-4">
            Create a group, add expenses, and see who owes whom. No sign-up required.
          </p>
          
          <div className="flex gap-2 justify-center">
            <button 
              className="btn btn-primary"
              onClick={() => { setShowCreate(true); setShowJoin(false); }}
            >
              Create Group
            </button>
            <button 
              className="btn btn-secondary"
              onClick={() => { setShowJoin(true); setShowCreate(false); }}
            >
              Join Group
            </button>
          </div>
        </div>

        {showCreate && (
          <div className="card">
            <h2 className="card-title mb-4">Create New Group</h2>
            <form onSubmit={handleCreateGroup}>
              <div className="input-group">
                <label htmlFor="groupName">Group Name</label>
                <input
                  id="groupName"
                  type="text"
                  className="input"
                  placeholder="e.g., Trip to Paris"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  autoFocus
                />
              </div>
              
              <div className="input-group">
                <label htmlFor="currency">Currency</label>
                <select 
                  id="currency"
                  className="select"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                >
                  <option value="EUR">EUR (Euro)</option>
                  <option value="USD">USD (US Dollar)</option>
                  <option value="GBP">GBP (British Pound)</option>
                  <option value="CHF">CHF (Swiss Franc)</option>
                  <option value="JPY">JPY (Japanese Yen)</option>
                </select>
              </div>
              
              {error && <p className="text-danger text-sm mb-2">{error}</p>}
              
              <div className="flex gap-2">
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Creating...' : 'Create Group'}
                </button>
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => setShowCreate(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {showJoin && (
          <div className="card">
            <h2 className="card-title mb-4">Join Existing Group</h2>
            <form onSubmit={handleJoinGroup}>
              <div className="input-group">
                <label htmlFor="joinLink">Group Link</label>
                <input
                  id="joinLink"
                  type="text"
                  className="input"
                  placeholder="Paste the group link here"
                  value={joinLink}
                  onChange={(e) => setJoinLink(e.target.value)}
                  autoFocus
                />
              </div>
              
              {error && <p className="text-danger text-sm mb-2">{error}</p>}
              
              <div className="flex gap-2">
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Joining...' : 'Join Group'}
                </button>
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => setShowJoin(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {recentGroups.length > 0 && (
          <div className="card">
            <h2 className="card-title mb-4">Recent Groups</h2>
            <ul className="list">
              {recentGroups.map((group) => (
                <li key={group.id} className="list-item">
                  <div>
                    <span className="font-bold">{group.name}</span>
                    <span className={`badge ml-2 ${group.permission === 'write' ? 'badge-write' : 'badge-read'}`}>
                      {group.permission}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={() => handleOpenRecent(group.id, group.token)}
                      disabled={loading}
                    >
                      Open
                    </button>
                    <button
                      className="btn btn-sm btn-secondary"
                      onClick={() => removeFromRecent(group.id)}
                    >
                      Remove
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="card">
          <h3 className="font-bold mb-2">How it works</h3>
          <ol className="text-sm text-muted" style={{ paddingLeft: '1.5rem' }}>
            <li className="mb-1">Create a group and share the link with friends</li>
            <li className="mb-1">Add expenses as they happen - multiple people can pay</li>
            <li className="mb-1">Split costs equally or with custom amounts</li>
            <li>See who owes whom and settle up easily</li>
          </ol>
        </div>

        <div className="card">
          <ThemeSettings />
        </div>
      </div>
    </div>
  );
}
