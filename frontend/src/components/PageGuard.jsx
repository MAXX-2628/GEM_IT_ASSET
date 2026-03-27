import { useAuth } from '../context/AuthContext'
import { ShieldAlert, Home, ArrowLeft } from 'lucide-react'
import { Button, Card, CardBody } from './ui'
import { useNavigate } from 'react-router-dom'

export default function PageGuard({ children, pageId }) {
    const { canAccessPage, loading } = useAuth()
    const navigate = useNavigate()

    if (loading) return null

    if (!canAccessPage(pageId)) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center p-8">
                <Card className="max-w-md w-full glass border-accent-red/20 shadow-2xl animate-in zoom-in-95 duration-500">
                    <CardBody className="p-10 text-center space-y-6">
                        <div className="w-20 h-20 bg-accent-red/10 border border-accent-red/20 rounded-2xl flex items-center justify-center mx-auto text-accent-red shadow-inner">
                            <ShieldAlert size={40} />
                        </div>
                        
                        <div className="space-y-2">
                            <h2 className="text-2xl font-black text-text-main uppercase tracking-tight">Access Restricted</h2>
                            <p className="text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] leading-relaxed">
                                Your current authorization level does not permit access to terminal node <span className="text-accent-red">[{pageId}]</span>.
                            </p>
                        </div>

                        <div className="h-px bg-gradient-to-r from-transparent via-border-main to-transparent opacity-50" />

                        <div className="flex flex-col gap-3">
                            <Button 
                                variant="primary" 
                                className="w-full h-12 shadow-primary font-black text-[10px] tracking-widest uppercase"
                                onClick={() => navigate('/')}
                                icon={Home}
                            >
                                Return to Dashboard
                            </Button>
                            <Button 
                                variant="ghost" 
                                className="w-full h-12 text-text-muted hover:text-text-main font-black text-[10px] tracking-widest uppercase"
                                onClick={() => navigate(-1)}
                                icon={ArrowLeft}
                            >
                                Go Back
                            </Button>
                        </div>
                    </CardBody>
                </Card>
            </div>
        )
    }

    return children
}
