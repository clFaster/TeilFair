import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSun, faMoon, faUsers, faPlus, faLink, faArrowRight, faReceipt, faCalculator, faHandshake } from '@fortawesome/free-solid-svg-icons';
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
      removeFromRecent(groupId);
      setError('This group is no longer accessible');
    }
  };

  const cycleTheme = () => {
    setThemePreference(mode === 'light' ? 'dark' : 'light');
  };

  const closeModals = () => {
    setShowCreate(false);
    setShowJoin(false);
    setError('');
    setGroupName('');
    setJoinLink('');
  };

  return (
    <div className="app app-home">
      <header className="header">
        <div className="header-content">
          <Link to="/" className="logo">
            <LogoIcon size={32} />
            <span>TeilFair</span>
          </Link>
          <button className="theme-toggle" onClick={cycleTheme} title={`Theme: ${mode}`}>
            <FontAwesomeIcon icon={mode === 'dark' ? faMoon : faSun} style={{ fontSize: '18px' }} />
          </button>
        </div>
      </header>
      
      <main className="container">
        {/* Hero Section */}
        <div className="hero-card animate-in">
          <h1 style={{ fontSize: 'clamp(2rem, 5vw, 2.75rem)', fontWeight: 700, marginBottom: '12px', letterSpacing: '-0.03em' }}>
            Split expenses,<br />stay fair
          </h1>
          <p style={{ fontSize: '1.125rem', opacity: 0.9, marginBottom: '28px', maxWidth: '380px', margin: '0 auto 28px', lineHeight: 1.6 }}>
            Track shared expenses with friends. No sign-up needed, just create and share.
          </p>
          
          <div className="flex gap-3 justify-center flex-wrap">
            <button 
              className="btn hero-btn-primary"
              onClick={() => { setShowCreate(true); setShowJoin(false); setError(''); }}
            >
              <FontAwesomeIcon icon={faPlus} />
              <span>Create Group</span>
            </button>
            <button 
              className="btn hero-btn-secondary"
              onClick={() => { setShowJoin(true); setShowCreate(false); setError(''); }}
            >
              <FontAwesomeIcon icon={faLink} />
              <span>Join Group</span>
            </button>
          </div>
        </div>

        {/* Create Group Form */}
        {showCreate && (
          <div className="card animate-in">
            <h2 className="card-title mb-4">Create New Group</h2>
            <form onSubmit={handleCreateGroup}>
              <div className="input-group">
                <label htmlFor="groupName">Group Name</label>
                <input
                  id="groupName"
                  type="text"
                  className="input"
                  placeholder="e.g., Trip to Paris, Roommates, Dinner Club"
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
                  <option value="EUR">EUR - Euro</option>
                  <option value="USD">USD - US Dollar</option>
                  <option value="GBP">GBP - British Pound</option>
                  <option value="CHF">CHF - Swiss Franc</option>
                  <option value="JPY">JPY - Japanese Yen</option>
                  <option value="CAD">CAD - Canadian Dollar</option>
                  <option value="AUD">AUD - Australian Dollar</option>
                  <option value="SEK">SEK - Swedish Krona</option>
                  <option value="NOK">NOK - Norwegian Krone</option>
                  <option value="DKK">DKK - Danish Krone</option>
                  <option value="PLN">PLN - Polish Zloty</option>
                  <option value="CZK">CZK - Czech Koruna</option>
                </select>
              </div>
              
              {error && <p className="text-danger text-sm mb-3">{error}</p>}
              
              <div className="flex gap-3">
                <button type="submit" className="btn btn-primary btn-lg" disabled={loading || !groupName.trim()}>
                  {loading ? 'Creating...' : 'Create Group'}
                  {!loading && <FontAwesomeIcon icon={faArrowRight} style={{ marginLeft: '4px' }} />}
                </button>
                <button 
                  type="button" 
                  className="btn btn-secondary btn-lg"
                  onClick={closeModals}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Join Group Form */}
        {showJoin && (
          <div className="card animate-in">
            <h2 className="card-title mb-4">Join Existing Group</h2>
            <form onSubmit={handleJoinGroup}>
              <div className="input-group">
                <label htmlFor="joinLink">Group Link</label>
                <input
                  id="joinLink"
                  type="text"
                  className="input"
                  placeholder="Paste the shared group link here..."
                  value={joinLink}
                  onChange={(e) => setJoinLink(e.target.value)}
                  autoFocus
                />
                <p className="text-sm text-muted mt-2">
                  Ask your friend for the group link they received when creating the group.
                </p>
              </div>
              
              {error && <p className="text-danger text-sm mb-3">{error}</p>}
              
              <div className="flex gap-3">
                <button type="submit" className="btn btn-primary btn-lg" disabled={loading || !joinLink.trim()}>
                  {loading ? 'Joining...' : 'Join Group'}
                  {!loading && <FontAwesomeIcon icon={faArrowRight} style={{ marginLeft: '4px' }} />}
                </button>
                <button 
                  type="button" 
                  className="btn btn-secondary btn-lg"
                  onClick={closeModals}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Recent Groups */}
        {recentGroups.length > 0 && !showCreate && !showJoin && (
          <div className="card animate-in animate-delay-1">
            <h2 className="card-title mb-3">
              <FontAwesomeIcon icon={faUsers} style={{ marginRight: '10px', opacity: 0.7 }} />
              Your Groups
            </h2>
            <div>
              {recentGroups.map((group) => (
                <div key={group.id} className="recent-group-card">
                  <div className="recent-group-info">
                    <span className="name">{group.name}</span>
                    <span className={`badge ${group.permission === 'write' ? 'badge-write' : 'badge-read'}`}>
                      {group.permission === 'write' ? 'full access' : 'view only'}
                    </span>
                  </div>
                  <div className="recent-group-actions">
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={() => handleOpenRecent(group.id, group.token)}
                      disabled={loading}
                    >
                      Open
                      <FontAwesomeIcon icon={faArrowRight} style={{ marginLeft: '6px', fontSize: '10px' }} />
                    </button>
                    <button
                      className="btn btn-sm btn-ghost"
                      onClick={() => removeFromRecent(group.id)}
                      title="Remove from list"
                    >
                      &times;
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* How it Works - Feature Cards */}
        {!showCreate && !showJoin && (
          <div className="card animate-in animate-delay-2">
            <h2 className="card-title mb-4">How it works</h2>
            <div className="feature-grid">
              <div className="feature-card">
                <div className="feature-icon">
                  <FontAwesomeIcon icon={faUsers} />
                </div>
                <div className="feature-content">
                  <h4>Create & Share</h4>
                  <p>Start a group and invite friends with a simple link. No accounts needed.</p>
                </div>
              </div>
              
              <div className="feature-card">
                <div className="feature-icon">
                  <FontAwesomeIcon icon={faReceipt} />
                </div>
                <div className="feature-content">
                  <h4>Log Expenses</h4>
                  <p>Add expenses as they happen. Support for multiple payers and custom splits.</p>
                </div>
              </div>
              
              <div className="feature-card">
                <div className="feature-icon">
                  <FontAwesomeIcon icon={faCalculator} />
                </div>
                <div className="feature-content">
                  <h4>See Balances</h4>
                  <p>Instantly see who owes whom with automatic calculations.</p>
                </div>
              </div>
              
              <div className="feature-card">
                <div className="feature-icon">
                  <FontAwesomeIcon icon={faHandshake} />
                </div>
                <div className="feature-content">
                  <h4>Settle Up</h4>
                  <p>Get optimized payment suggestions to minimize transactions.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {error && !showCreate && !showJoin && (
          <div className="card animate-in" style={{ background: 'var(--clr-danger-a20)', borderColor: 'var(--clr-danger-a10)' }}>
            <p className="text-danger">{error}</p>
          </div>
        )}
      </main>
      
      <footer className="footer">
        <span style={{ opacity: 0.7 }}>TeilFair</span> &middot; Split expenses fairly
      </footer>
    </div>
  );
}
