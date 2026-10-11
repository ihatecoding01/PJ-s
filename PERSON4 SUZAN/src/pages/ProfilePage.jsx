import React, { useState, useEffect } from 'react';
import { getMe, updateMe, getUser } from '../api/users.js';
import { useWallet } from '../context/WalletContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { Card, Button, Badge } from '../components/ui/index.js';
import AddressChip from '../components/ui/AddressChip.jsx';
import { User, Github, Save, ExternalLink, ShieldCheck, CheckCircle2, Wallet } from 'lucide-react';

export default function ProfilePage({ targetAddress = null }) {
  const { address, user, isConnected, openConnectModal, refreshUser } = useWallet();
  const toast = useToast();

  const isMyProfile = !targetAddress || (address && targetAddress.toLowerCase() === address.toLowerCase());

  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [role, setRole] = useState('FREELANCER');
  const [skillsInput, setSkillsInput] = useState('');
  const [githubUsername, setGithubUsername] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadProfile() {
      if (isMyProfile && !isConnected) {
        setIsLoading(false);
        return;
      }
      try {
        setIsLoading(true);
        let data = null;
        try {
          data = isMyProfile ? await getMe() : await getUser(targetAddress);
        } catch {
          if (isMyProfile && user) {
            data = user;
          }
        }
        if (data) {
          setName(data.name || '');
          setBio(data.bio || '');
          setRole(data.role || 'FREELANCER');
          setSkillsInput(Array.isArray(data.skills) ? data.skills.join(', ') : (data.skills || ''));
          setGithubUsername(data.githubUsername || '');
        } else if (isMyProfile && user) {
          setName(user.name || '');
          setBio(user.bio || '');
          setRole(user.role || 'FREELANCER');
          setSkillsInput(Array.isArray(user.skills) ? user.skills.join(', ') : (user.skills || ''));
          setGithubUsername(user.githubUsername || '');
        }
      } catch (err) {
        toast.error('Could not load profile');
      } finally {
        setIsLoading(false);
      }
    }
    loadProfile();
  }, [targetAddress, isMyProfile, isConnected, user]);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      const skills = skillsInput.split(',').map(s => s.trim()).filter(Boolean);
      await updateMe({
        name: name.trim(),
        bio: bio.trim(),
        role,
        skills,
        githubUsername: githubUsername.trim()
      });
      await refreshUser();
      toast.success('Profile updated successfully');
    } catch (err) {
      toast.error(err.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isConnected && isMyProfile) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center space-y-5 animate-fade-in">
        <div className="w-16 h-16 mx-auto rounded-card bg-sage flex items-center justify-center text-forest">
          <User className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-heading font-bold text-ink">Connect Wallet to Manage Profile</h2>
          <p className="text-sm text-ink/60 max-w-md mx-auto">
            Your SANKALP identity binds your on-chain address to verifiable GitHub credentials and reputation.
          </p>
        </div>
        <div className="pt-2">
          <Button variant="primary" size="lg" onClick={openConnectModal} icon={Wallet}>
            Connect Wallet
          </Button>
        </div>
      </div>
    );
  }

  const activeAddress = targetAddress || address;

  return (
    <div className="max-w-5xl mx-auto px-4 lg:px-8 py-8 space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl md:text-3xl font-heading font-bold text-ink tracking-tight">
          {isMyProfile ? 'Your SANKALP Identity' : 'Public Profile'}
        </h1>
        <p className="text-sm text-ink/60 mt-1">
          Cryptographically linked decentralized freelancer profile with verified deliverables.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Profile Card */}
        <Card className="flex flex-col items-center text-center p-6 space-y-4">
          <div className="w-20 h-20 rounded-full bg-forest text-ivory flex items-center justify-center font-heading font-bold text-2xl shadow-sm">
            {name ? name.charAt(0).toUpperCase() : 'U'}
          </div>

          <div>
            <h2 className="text-lg font-heading font-bold text-ink">{name || 'Anonymous User'}</h2>
            <div className="mt-1 flex items-center justify-center gap-1.5">
              <Badge status={role === 'CLIENT' ? 'pending' : 'success'}>
                {role}
              </Badge>
            </div>
            {activeAddress && (
              <div className="mt-3 flex justify-center">
                <AddressChip address={activeAddress} />
              </div>
            )}
          </div>

          {bio && (
            <p className="text-xs text-ink/70 leading-relaxed text-left bg-ivory p-3.5 rounded-card border border-gray w-full">
              {bio}
            </p>
          )}

          {githubUsername && (
            <a
              href={`https://github.com/${githubUsername}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-xs font-mono text-forest bg-sage/60 px-3 py-1.5 rounded-[8px] hover:bg-sage transition-colors border border-gray"
            >
              <Github className="w-4 h-4" />
              github.com/{githubUsername}
              <ExternalLink className="w-3 h-3 text-ink/40" />
            </a>
          )}
        </Card>

        {/* Profile Edit Form */}
        <div className="md:col-span-2">
          {isMyProfile ? (
            <Card className="space-y-6">
              <h3 className="font-heading font-bold text-base text-ink pb-3 border-b border-gray">
                Edit Profile Details
              </h3>

              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="block text-xs font-heading font-semibold uppercase tracking-wider text-ink/70 mb-1">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Dhruv"
                    className="w-full bg-white border border-gray rounded-[10px] px-3.5 py-2.5 text-xs text-ink focus:outline-none focus:border-forest"
                  />
                </div>

                <div>
                  <label className="block text-xs font-heading font-semibold uppercase tracking-wider text-ink/70 mb-1">
                    Persona Role
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {['FREELANCER', 'CLIENT', 'BOTH'].map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setRole(r)}
                        className={`py-2 px-3 text-xs font-heading font-semibold rounded-[8px] border transition-all ${
                          role === r
                            ? 'bg-forest text-ivory border-forest shadow-sm'
                            : 'bg-white border-gray text-ink/70 hover:bg-sage'
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-heading font-semibold uppercase tracking-wider text-ink/70 mb-1">
                    Professional Bio
                  </label>
                  <textarea
                    rows={3}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Describe your Web3 background, escrow experience, and core domains..."
                    className="w-full bg-white border border-gray rounded-[10px] px-3.5 py-2.5 text-xs text-ink focus:outline-none focus:border-forest"
                  />
                </div>

                <div>
                  <label className="block text-xs font-heading font-semibold uppercase tracking-wider text-ink/70 mb-1">
                    Skills (Comma Separated)
                  </label>
                  <input
                    type="text"
                    value={skillsInput}
                    onChange={(e) => setSkillsInput(e.target.value)}
                    placeholder="TypeScript, Solidity, React, Smart Contracts, DeFi"
                    className="w-full bg-white border border-gray rounded-[10px] px-3.5 py-2.5 text-xs text-ink focus:outline-none focus:border-forest"
                  />
                </div>

                <div>
                  <label className="block text-xs font-heading font-semibold uppercase tracking-wider text-ink/70 mb-1">
                    GitHub Username (Used for Milestone Code Analysis)
                  </label>
                  <input
                    type="text"
                    value={githubUsername}
                    onChange={(e) => setGithubUsername(e.target.value)}
                    placeholder="your-github-username"
                    className="w-full bg-white border border-gray rounded-[10px] px-3.5 py-2.5 text-xs text-ink focus:outline-none focus:border-forest"
                  />
                </div>

                <div className="pt-2">
                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    loading={isSaving}
                    icon={Save}
                  >
                    Save Changes
                  </Button>
                </div>
              </form>
            </Card>
          ) : (
            <Card className="space-y-4">
              <h3 className="font-heading font-bold text-base text-ink pb-3 border-b border-gray">
                Verified Skills & Endorsements
              </h3>
              <div className="flex flex-wrap gap-2">
                {skillsInput ? (
                  skillsInput.split(',').map((skill, i) => (
                    <span
                      key={i}
                      className="px-3 py-1 rounded-full text-xs font-medium bg-sage text-forest border border-forest/15"
                    >
                      {skill.trim()}
                    </span>
                  ))
                ) : (
                  <p className="text-xs text-ink/50">No listed skills.</p>
                )}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
