import React, { useState, useEffect } from 'react';
import { getMe, updateMe, getUser } from '../api/users.js';
import { useWallet } from '../context/WalletContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import Card from '../components/common/Card.jsx';
import Button from '../components/common/Button.jsx';
import AddressBadge from '../components/common/AddressBadge.jsx';
import Badge from '../components/common/Badge.jsx';
import { User, Github, Save, ExternalLink, ShieldCheck, CheckCircle2 } from 'lucide-react';

export default function ProfilePage({ targetAddress = null }) {
  const { address, refreshUser } = useWallet();
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
      try {
        setIsLoading(true);
        const data = isMyProfile ? await getMe() : await getUser(targetAddress);
        if (data) {
          setName(data.name || '');
          setBio(data.bio || '');
          setRole(data.role || 'FREELANCER');
          setSkillsInput((data.skills || []).join(', '));
          setGithubUsername(data.githubUsername || '');
        }
      } catch (err) {
        toast.error('Could not load profile');
      } finally {
        setIsLoading(false);
      }
    }
    loadProfile();
  }, [targetAddress, isMyProfile]);

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
      toast.success('Profile updated successfully!');
    } catch (err) {
      toast.error(err.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center text-slate-400">
        Loading profile...
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight">
            {isMyProfile ? 'Your Web3 Identity & Profile' : 'Public Member Profile'}
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            {isMyProfile ? 'Configure your role, skills, and linked GitHub credentials.' : 'Verified platform participant details.'}
          </p>
        </div>
        <AddressBadge address={targetAddress || address} chars={4} />
      </div>

      <Card className="space-y-6">
        <form onSubmit={handleSave} className="space-y-5">
          {/* Display Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Display Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Alice Vanguard"
              disabled={!isMyProfile}
              className="w-full bg-surface-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-400 disabled:opacity-70"
            />
          </div>

          {/* Role selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Primary Platform Role
            </label>
            {isMyProfile ? (
              <div className="grid grid-cols-3 gap-2">
                {['CLIENT', 'FREELANCER', 'ARBITRATOR'].map(r => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${
                      role === r
                        ? 'bg-teal-500/20 border-teal-500/50 text-teal-300'
                        : 'bg-surface-800 border-slate-700 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            ) : (
              <Badge label={role} variant={role} size="md" />
            )}
          </div>

          {/* GitHub Username */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              GitHub Username (for commit verification)
            </label>
            <div className="flex items-center gap-2 bg-surface-800 border border-slate-700 rounded-xl px-3.5 py-2.5">
              <Github className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="text"
                value={githubUsername}
                onChange={(e) => setGithubUsername(e.target.value)}
                placeholder="github-handle"
                disabled={!isMyProfile}
                className="w-full bg-transparent text-sm text-slate-100 focus:outline-none font-mono disabled:opacity-70"
              />
            </div>
          </div>

          {/* Bio */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Bio & Experience
            </label>
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Web3 engineer building decentralized escrow, DeFi protocols, or security audits..."
              disabled={!isMyProfile}
              className="w-full bg-surface-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-400 resize-none disabled:opacity-70"
            />
          </div>

          {/* Skills */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Skills & Proficiencies (comma separated)
            </label>
            <input
              type="text"
              value={skillsInput}
              onChange={(e) => setSkillsInput(e.target.value)}
              placeholder="Solidity, React, Hardhat, Ethers.js, Security Auditing"
              disabled={!isMyProfile}
              className="w-full bg-surface-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-400 disabled:opacity-70"
            />
          </div>

          {isMyProfile && (
            <div className="pt-3 border-t border-slate-800 flex justify-end">
              <Button type="submit" variant="primary" isLoading={isSaving} icon={Save}>
                Save Changes
              </Button>
            </div>
          )}
        </form>
      </Card>
    </div>
  );
}
