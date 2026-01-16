import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSun, faMoon } from '@fortawesome/free-solid-svg-icons';
import { useGroupStore } from '../store/groupStore';
import { useTheme } from '../theme/ThemeProvider';
import { LogoIcon } from '../components/LogoIcon';

export function HomePage() {
  const navigate = useNavigate();
  const { createGroup, loadGroup, recentGroups, removeFromRecent, loading } = useGroupStore();
  const { mode, setThemePreference } = useTheme();
  
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

  const cycleTheme = () => {
    setThemePreference(mode === 'light' ? 'dark' : 'light');
  };

  const getThemeIcon = () => {
    return mode === 'dark' ? faMoon : faSun;
  };

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <Link to="/" className="logo">
            <LogoIcon size={32} />
            <span>TeilFair</span>
          </Link>
          <button className="theme-toggle" onClick={cycleTheme} title={`Theme: ${mode}`}>
            <FontAwesomeIcon icon={getThemeIcon()} style={{ fontSize: '16px' }} />
          </button>
        </div>
      </header>
      
      <div className="container">
        <div className="card hero-card text-center">
          <h1 className="mb-2" style={{ fontSize: '28px', fontWeight: 700 }}>Split expenses fairly</h1>
          <p className="text-secondary mb-4" style={{ fontSize: '16px', maxWidth: '400px', margin: '0 auto 24px' }}>
            Create a group, add expenses, and see who owes whom. No sign-up required.
          </p>
          
          <div className="flex gap-3 justify-center flex-wrap">
            <button 
              className="btn btn-lg"
              style={{ background: 'white', color: 'var(--clr-primary-a0)' }}
              onClick={() => { setShowCreate(true); setShowJoin(false); setError(''); }}
            >
              Create Group
            </button>
            <button 
              className="btn btn-lg"
              style={{ background: 'rgba(255,255,255,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.4)' }}
              onClick={() => { setShowJoin(true); setShowCreate(false); setError(''); }}
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
              
              {error && <p className="text-danger text-sm mb-3">{error}</p>}
              
              <div className="flex gap-3">
                <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
                  {loading ? 'Creating...' : 'Create Group'}
                </button>
                <button 
                  type="button" 
                  className="btn btn-secondary btn-lg"
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
              
              {error && <p className="text-danger text-sm mb-3">{error}</p>}
              
              <div className="flex gap-3">
                <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
                  {loading ? 'Joining...' : 'Join Group'}
                </button>
                <button 
                  type="button" 
                  className="btn btn-secondary btn-lg"
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
            <h2 className="card-title mb-3">Recent Groups</h2>
            <ul className="list">
              {recentGroups.map((group) => (
                <li key={group.id} className="list-item">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold">{group.name}</span>
                    <span className={`badge ${group.permission === 'write' ? 'badge-write' : 'badge-read'}`}>
                      {group.permission === 'write' ? 'edit' : 'view'}
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
                      className="btn btn-sm btn-ghost"
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
          <h3 className="font-semibold mb-3">How it works</h3>
          <ol className="text-secondary" style={{ paddingLeft: '1.5rem', lineHeight: 2 }}>
            <li>Create a group and share the link with friends</li>
            <li>Add expenses as they happen - multiple people can pay</li>
            <li>Split costs equally or with custom amounts</li>
            <li>See who owes whom and settle up easily</li>
          </ol>
        </div>
      </div>
      
      <footer className="footer">
        TeilFair - Split expenses fairly
      </footer>
    </div>
  );
}
