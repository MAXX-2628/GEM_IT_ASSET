import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, ArrowRight, MapPin, Globe, Cpu } from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import { Card, CardBody, Button } from '../components/ui';

export default function SelectBranch() {
    const [branches, setBranches] = useState([]);
    const [loading, setLoading] = useState(true);
    const { setBranch, user } = useAuth();
    const navigate = useNavigate();

    const handleSelectBranch = useCallback((branch) => {
        setBranch(branch);
        navigate('/'); // Redirect to dashboard
    }, [setBranch, navigate]);

    const fetchBranches = useCallback(async () => {
        try {
            const { data } = await api.get('/branches');
            // Filter based on user access
            let availableBranches = data.data;

            if (user && user.role !== 'super_admin' && user.hasFullAccess === false) {
                const allowed = user.assignedBranches || [];
                availableBranches = data.data.filter(b => allowed.includes(b.code));
            }

            setBranches(availableBranches);

            // If only one branch, auto-select for better UX
            if (availableBranches.length === 1) {
                handleSelectBranch(availableBranches[0]);
            }
        } catch {
            toast.error('Failed to load branches.');
        } finally {
            setLoading(false);
        }
    }, [user, handleSelectBranch]);

    useEffect(() => {
        fetchBranches();
    }, [fetchBranches]);

    if (loading) {
        return (
            <div className="min-h-screen bg-bg-main flex flex-col items-center justify-center font-sans">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary animate-pulse mb-6">
                    <Cpu size={32} />
                </div>
                <div className="text-[10px] text-primary font-bold uppercase tracking-[0.4em] animate-pulse">Syncing Branch List...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-bg-main flex flex-col font-sans relative overflow-hidden">
             {/* Background Grid */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
                 style={{ backgroundImage: 'radial-gradient(var(--text-main) 1px, transparent 0)', backgroundSize: '40px 40px' }} />

            <header className="h-20 bg-bg-main/80 backdrop-blur-md border-b border-border-main px-10 flex items-center justify-between z-20">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center">
                        <Building2 size={20} />
                    </div>
                    <div className="text-[10px] text-text-muted font-black uppercase tracking-[0.4em]">IT_ASSET_MANAGER_v5.2.0</div>
                </div>
            </header>

            <main className="flex-1 flex flex-col items-center justify-center p-10 z-10">
                <div className="max-w-4xl w-full">
                    <div className="mb-12 text-center">
                        <h1 className="text-4xl font-black text-text-main tracking-tight mb-4 uppercase">Select Branch</h1>
                        <div className="flex items-center justify-center gap-4">
                            <div className="h-[2px] w-12 bg-gradient-to-r from-transparent to-primary/50" />
                            <p className="text-xs font-bold text-text-muted uppercase tracking-[0.2em]">
                                Select Operational Branch
                            </p>
                            <div className="h-[2px] w-12 bg-gradient-to-l from-transparent to-primary/50" />
                        </div>
                    </div>

                    <div className="flex flex-col gap-4 max-w-2xl mx-auto w-full">
                        {branches.length === 0 ? (
                            <Card className="py-20 flex flex-col items-center justify-center text-center glass border-dashed border-border-main">
                                <Globe size={48} className="text-text-muted/50 mb-6" />
                                <h3 className="text-text-main font-black uppercase tracking-widest text-lg">No Authorization Chains</h3>
                                <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest max-w-xs mt-3">CONTACT SYSTEM_ADMIN FOR NODE_ASSIGNMENT</p>
                            </Card>
                        ) : (
                            branches.map((branch) => (
                                <button
                                    key={branch._id}
                                    onClick={() => handleSelectBranch(branch)}
                                    className="group w-full relative"
                                >
                                    <div className={`
                                        relative overflow-hidden
                                        bg-bg-card border border-border-main rounded-2xl p-4
                                        flex items-center justify-between gap-6
                                        transition-all duration-300 hover:border-primary/50 hover:bg-bg-card-elevated
                                        hover:shadow-[0_8px_30px_-10px_var(--primary-glow)]
                                    `}>
                                        {/* Background hover accent */}
                                        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                        
                                        <div className="flex items-center gap-5 relative z-10 flex-1">
                                            <div className="w-12 h-12 bg-neutral-subtle border border-border-main text-text-muted rounded-xl flex items-center justify-center group-hover:bg-primary group-hover:text-white group-hover:border-primary transition-all duration-300 shrink-0 shadow-inner">
                                                <MapPin size={20} />
                                            </div>
                                            
                                            <div className="flex flex-col items-start min-w-0">
                                                <h3 className="font-black text-text-main text-sm group-hover:text-primary transition-colors uppercase tracking-wider truncate w-full">
                                                    {branch.name}
                                                </h3>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-[9px] font-mono text-text-muted uppercase tracking-[0.1em]">NODE_ID: {branch.code}</span>
                                                    <span className="w-1 h-1 bg-border-main rounded-full" />
                                                    <span className="text-[8px] font-bold text-accent-teal uppercase tracking-widest">Active Link</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-6 relative z-10 shrink-0">
                                            <div className="hidden sm:flex flex-col items-end opacity-0 group-hover:opacity-100 transition-all duration-500 translate-x-4 group-hover:translate-x-0">
                                                <span className="text-[8px] font-black text-primary uppercase tracking-[0.2em]">Ready to Connect</span>
                                                <span className="text-[8px] text-text-muted uppercase tracking-[0.1em] mt-0.5">ESTABLISH_SESSION</span>
                                            </div>

                                            <div className="w-10 h-10 rounded-xl bg-neutral-subtle border border-border-main flex items-center justify-center text-text-muted group-hover:text-primary group-hover:border-primary/50 group-hover:bg-primary/5 transition-all duration-300">
                                                <ArrowRight size={18} className="transition-transform duration-300 group-hover:translate-x-1" />
                                            </div>
                                        </div>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>
            </main>

            <footer className="p-10 text-center border-t border-border-main bg-bg-main relative z-20">
                <div className="text-[9px] text-text-muted font-mono uppercase tracking-[0.5em]">
                    GEM_ASSETS · SECURE_MANAGEMENT_HUB · BRANCH_GATEWAY_v5
                </div>
            </footer>
        </div>
    )
}




