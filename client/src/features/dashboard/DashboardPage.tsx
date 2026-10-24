import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, ClipboardList, Package, Target, Wallet } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth'
import { useI18n } from '../../lib/i18n'
import { StatusChip } from '../../components/StatusChip'

type RecentOrder = { id:string; order_number:number; status:string; total_amount:number; created_at:string; accounts?:{name:string}|null }
type Stats = { activeOrders:number; overdueOrders:number; outstanding:number; opportunities:number; pipelineValue:number; items:number; recent:RecentOrder[] }
const money = (v:number) => new Intl.NumberFormat(undefined,{style:'currency',currency:'USD',maximumFractionDigits:0}).format(v||0)
export function DashboardPage() {
 const {t}=useI18n(); const {profile}=useAuth(); const navigate=useNavigate()
 const [stats,setStats]=useState<Stats>({activeOrders:0,overdueOrders:0,outstanding:0,opportunities:0,pipelineValue:0,items:0,recent:[]})
 const [loading,setLoading]=useState(true)
 useEffect(()=>{async function load(){
  const [ordersRes,paymentsRes,oppsRes,itemsRes]=await Promise.all([
   supabase.from('orders').select('id,order_number,status,total_amount,expected_completion_date,created_at,accounts(name)').order('created_at',{ascending:false}),
   supabase.from('order_payments').select('order_id,amount'),
   supabase.from('opportunities').select('amount,stage').not('stage','in','("won","lost")'),
   supabase.from('catalog_items').select('id').eq('is_active',true)
  ])
  const orders=(ordersRes.data||[]) as unknown as Array<{id:string;order_number:number;status:string;total_amount:number;expected_completion_date:string|null;created_at:string;accounts:{name:string}|null}>;const payments=paymentsRes.data||[];const opps=oppsRes.data||[]
  const paid=payments.reduce<Record<string,number>>((acc,p)=>{acc[p.order_id]=(acc[p.order_id]||0)+Number(p.amount);return acc},{})
  const today=new Date().toISOString().slice(0,10)
  setStats({activeOrders:orders.filter(o=>['pending','in_progress'].includes(o.status)).length,overdueOrders:orders.filter(o=>o.expected_completion_date&&o.expected_completion_date<today&&!['fulfilled','cancelled'].includes(o.status)).length,outstanding:orders.reduce((sum,o)=>sum+Math.max(0,Number(o.total_amount||0)-(paid[o.id]||0)),0),opportunities:opps.length,pipelineValue:opps.reduce((sum,o)=>sum+Number(o.amount||0),0),items:itemsRes.data?.length||0,recent:orders.slice(0,6) as RecentOrder[]})
  setLoading(false)
 }void load()},[])
 const cards=[{label:t('Active orders'),value:stats.activeOrders,detail:t('Pending or in progress'),icon:ClipboardList,go:()=>navigate('/pipeline')},{label:t('Overdue orders'),value:stats.overdueOrders,detail:t('Past expected completion date'),icon:Target,go:()=>navigate('/pipeline')},{label:t('Outstanding balance'),value:money(stats.outstanding),detail:t('Remaining across visible orders'),icon:Wallet,go:()=>navigate('/orders')},{label:t('Catalogue items'),value:stats.items,detail:t('Machines and parts registered'),icon:Package,go:()=>navigate('/parts')}]
 return <div className="p-5 md:p-6 max-w-[1600px] mx-auto space-y-5">
  <header className="flex flex-wrap justify-between items-start gap-3"><div><h1 className="text-xl font-semibold">{t('Operations Dashboard')}</h1><p className="text-sm text-graphite-500 mt-1">{t('A practical overview of work that needs attention.')}</p></div><button className="btn-ghost" onClick={()=>navigate('/pipeline')}>{t('Open pipeline')} <ArrowRight size={14} className="inline ml-1"/></button></header>
  {loading?<div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">{[1,2,3,4].map(i=><div key={i} className="panel h-28 animate-pulse bg-graphite-800"/>)}</div>:<>
   <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">{cards.map(card=><button key={card.label} onClick={card.go} className="panel p-4 text-left hover:border-amber-500/60 transition-colors"><div className="flex items-center justify-between"><span className="text-xs uppercase tracking-wide text-graphite-500">{card.label}</span><card.icon size={17} className="text-amber-400"/></div><div className="text-2xl font-semibold mt-3">{card.value}</div><div className="text-xs text-graphite-500 mt-1">{card.detail}</div></button>)}</div>
   <div className="grid grid-cols-1 xl:grid-cols-3 gap-4"><section className="panel xl:col-span-2 overflow-hidden"><div className="p-4 border-b border-graphite-700 flex justify-between items-center"><div><h2 className="font-semibold">{t('Recent orders')}</h2><p className="text-xs text-graphite-500 mt-1">{t('Latest orders visible to your account')}</p></div><button className="btn-ghost text-xs" onClick={()=>navigate('/orders')}>{t('View all')} <ArrowRight size={13} className="inline"/></button></div><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-xs text-graphite-500 border-b border-graphite-800"><th className="text-left p-3">{t('Order')}</th><th className="text-left p-3">{t('Client')}</th><th className="text-left p-3">{t('Status')}</th><th className="text-right p-3">{t('Amount')}</th></tr></thead><tbody>{stats.recent.map(o=><tr key={o.id} className="border-b border-graphite-800 cursor-pointer hover:bg-graphite-800/60" onClick={()=>navigate('/pipeline')}><td className="p-3 font-mono">#{o.order_number}</td><td className="p-3">{o.accounts?.name||'—'}</td><td className="p-3"><StatusChip status={o.status}/></td><td className="p-3 text-right font-mono">{money(Number(o.total_amount||0))}</td></tr>)}{stats.recent.length===0&&<tr><td colSpan={4} className="p-6 text-center text-graphite-500">{t('No orders yet. Create the first order to start tracking work.')}</td></tr>}</tbody></table></div></section>
    <section className="panel p-4 space-y-4"><div><h2 className="font-semibold">{t('Sales pipeline')}</h2><p className="text-xs text-graphite-500 mt-1">{t('Potential work that has not yet become an order')}</p><div className="text-2xl font-semibold text-amber-400 mt-3">{money(stats.pipelineValue)}</div><p className="text-sm text-graphite-400">{stats.opportunities} {t('open opportunities')}</p><button className="btn-ghost text-xs mt-2" onClick={()=>navigate('/pipeline')}>{t('Review opportunities')} <ArrowRight size={13} className="inline"/></button></div><div className="border-t border-graphite-700 pt-4"><p className="text-xs text-graphite-500">{t('Signed in as')}</p><p className="text-sm font-medium mt-1">{profile?.full_name||profile?.email}</p><p className="text-xs text-graphite-500 mt-1">{profile?.branch_id? t('Assigned branch')+': '+profile.branch_id:profile?.can_view_all_branches?t('All-branch access'):t('No branch assigned')}</p></div></section>
   </div>
  </>}
 </div>
}