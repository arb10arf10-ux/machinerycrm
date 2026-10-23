import { useEffect, useMemo, useState } from 'react'
import { Plus, Search, RefreshCw, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth'
import type { Tables } from '../../../../shared/database.types'
import {useI18n} from '../../lib/i18n'

type Order = Tables<'orders'>
type Account = Tables<'accounts'>
type Location = Tables<'locations'>
type Payment = Tables<'order_payments'>
type Tab = 'new' | 'all' | 'pending'
const orderStatuses: Order['status'][] = ['pending','in_progress','fulfilled','cancelled']
const processes: Order['process'][] = ['sale','rental','service','parts','other']
const money = (value:number) => new Intl.NumberFormat(undefined,{minimumFractionDigits:2,maximumFractionDigits:2}).format(value)
const titleCase = (value:string) => value.replace(/_/g,' ').replace(/\b\w/g, (c: string) => c.toUpperCase())

export function OrdersPage() {
 const {t}=useI18n()
 const { profile } = useAuth()
 const [tab,setTab] = useState<Tab>('new')
 const [orders,setOrders] = useState<Order[]>([])
 const [accounts,setAccounts] = useState<Account[]>([])
 const [branches,setBranches] = useState<Location[]>([])
 const [payments,setPayments] = useState<Payment[]>([])
 const [loading,setLoading] = useState(true)
 const [saving,setSaving] = useState(false)
 const [search,setSearch] = useState('')
 const [branchFilter,setBranchFilter] = useState('')
 const [statusFilter,setStatusFilter] = useState('')
 const [message,setMessage] = useState('')
 const [error,setError] = useState('')
 const [branchId,setBranchId] = useState('')
 const [accountId,setAccountId] = useState('')
 const [newClient,setNewClient] = useState(false)
 const [clientName,setClientName] = useState('')
 const [clientPhone,setClientPhone] = useState('')
 const [process,setProcess] = useState<Order['process']>('sale')
 const [status,setStatus] = useState<Order['status']>('pending')
 const [total,setTotal] = useState('')
 const [initialPaid,setInitialPaid] = useState('0')
 const [notes,setNotes] = useState('')
 const [expectedDate,setExpectedDate] = useState('')
 const [rentalStart,setRentalStart] = useState('')
 const [rentalEnd,setRentalEnd] = useState('')
 const [selected,setSelected] = useState<Order|null>(null)
 const [paymentAmount,setPaymentAmount] = useState('')
 const [paymentNote,setPaymentNote] = useState('')

 async function load() {
  setLoading(true); setError('')
  const [o,a,b,p] = await Promise.all([
   supabase.from('orders').select('*').order('created_at',{ascending:false}),
   supabase.from('accounts').select('*').eq('is_active',true).order('name'),
   supabase.from('locations').select('*').eq('is_active',true).eq('type','branch').order('name'),
   supabase.from('order_payments').select('*').order('paid_at',{ascending:false})
  ])
  const failure = o.error || a.error || b.error || p.error
  if (failure) setError(failure.message)
  setOrders(o.data || []); setAccounts(a.data || []); setBranches(b.data || []); setPayments(p.data || [])
  if (!branchId && b.data?.length) setBranchId(b.data[0].id)
  setLoading(false)
 }
 useEffect(()=>{void load()},[])
 const accountNames = useMemo(()=>new Map(accounts.map(a=>[a.id,a.name])),[accounts])
 const branchNames = useMemo(()=>new Map(branches.map(b=>[b.id,b.name])),[branches])
 const paymentTotals = useMemo(()=>payments.reduce<Record<string,number>>((totals,p)=>{totals[p.order_id]=(totals[p.order_id]||0)+Number(p.amount);return totals},{}),[payments])
 const visibleOrders = useMemo(()=>orders.filter(o=>{
  const term=search.trim().toLowerCase()
  const searchMatch = !term || String(o.order_number).includes(term) || (accountNames.get(o.account_id)||'').toLowerCase().includes(term)
  return searchMatch && (!branchFilter || o.branch_id===branchFilter) && (!statusFilter || (statusFilter==='pending_group' ? o.status==='pending'||o.status==='in_progress' : o.status===statusFilter)) && (tab!=='pending'||o.status==='pending'||o.status==='in_progress')
 }),[orders,search,branchFilter,statusFilter,tab,accountNames])
 const totalAmount = (o:Order) => Number(o.total_amount||0)
 const paidAmount = (o:Order) => paymentTotals[o.id]||0
 const remaining = (o:Order) => Math.max(0,totalAmount(o)-paidAmount(o))
 const paymentStatus = (o:Order) => paidAmount(o)<=0?'Unpaid':paidAmount(o)+0.005>=totalAmount(o)?'Paid':'Partially paid'

 async function createOrder(ev:React.FormEvent) {
  ev.preventDefault(); setError('');setMessage('')
  if (!profile || !branchId || (!newClient&&!accountId) || (newClient&&!clientName.trim())) {setError(t('Choose a branch and client, or enter a new client name.'));return}
  const totalValue=Number(total),paidValue=Number(initialPaid||0)
  if (!Number.isFinite(totalValue)||totalValue<0||!Number.isFinite(paidValue)||paidValue<0||paidValue>totalValue) {setError(t('Amounts must be valid, and the initial payment cannot exceed the total.'));return}
  setSaving(true)
  try {
   let chosenAccount=accountId
   if(newClient) {
    const {data,error:clientError}=await supabase.from('accounts').insert({name:clientName.trim(),account_type:'customer',phone:clientPhone.trim()||null,owner_id:profile.id}).select('*').single()
    if(clientError) throw clientError
    chosenAccount=data.id
   }
   const {data:order,error:orderError}=await supabase.from('orders').insert({branch_id:branchId,account_id:chosenAccount,created_by:profile.id,process,status,total_amount:totalValue,notes:notes.trim()||null,expected_completion_date:expectedDate||null,rental_start_date:process==='rental'?(rentalStart||null):null,rental_end_date:process==='rental'?(rentalEnd||null):null}).select('*').single()
   if(orderError) throw orderError
   if(paidValue>0) {
    const {error:paymentError}=await supabase.from('order_payments').insert({order_id:order.id,amount:paidValue,recorded_by:profile.id,notes:'Initial payment'})
    if(paymentError) throw paymentError
   }
   setMessage(t('Order created successfully.'))
   setAccountId('');setNewClient(false);setClientName('');setClientPhone('');setProcess('sale');setStatus('pending');setTotal('');setInitialPaid('0');setNotes('');setExpectedDate('');setRentalStart('');setRentalEnd('')
   await load();setTab('all')
  } catch (caught) {setError(caught instanceof Error?caught.message:'Could not create order. Check your permissions and try again.')}
  finally {setSaving(false)}
 }
 async function updateStatus(order:Order,next:Order['status']) {
  setError('');setMessage('')
  const {error:e}=await supabase.from('orders').update({status:next}).eq('id',order.id)
  if(e){setError(e.message);return}
  setMessage(t('Order status updated.'));await load()
 }
 async function addPayment(e:React.FormEvent) {
  e.preventDefault();if(!selected||!profile)return
  setError('');setMessage('')
  const amount=Number(paymentAmount)
  if(!Number.isFinite(amount)||amount<=0){setError(t('Enter a payment amount greater than zero.'));return}
  if(amount>remaining(selected)+0.005){setError(t('Payment cannot exceed the remaining balance.'));return}
  setSaving(true)
  const {error:paymentError}=await supabase.from('order_payments').insert({order_id:selected.id,amount,notes:paymentNote.trim()||null,recorded_by:profile.id})
  setSaving(false)
  if(paymentError){setError(paymentError.message);return}
  setMessage(t('Payment recorded.'));setPaymentAmount('');setPaymentNote('');setSelected(null);await load()
 }

 return <div className="p-6 space-y-5 max-w-[1500px] mx-auto">
  <header className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-xl font-semibold">{t('Order Reports')}</h1><p className="text-sm text-graphite-500 mt-1">{t('Record transactions, track payments, and follow up on pending orders.')}</p></div><button className="btn-ghost flex items-center gap-2" onClick={()=>void load()}><RefreshCw size={15}/>{t('Refresh')}</button></header>
  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">{[{label:t('Total orders'),value:orders.length},{label:t('Active / pending'),value:orders.filter(o=>o.status==='pending'||o.status==='in_progress').length},{label:t('Outstanding balance'),value:money(orders.reduce((sum,o)=>sum+remaining(o),0))}].map(k=><div key={k.label} className="panel p-4"><p className="text-xs text-graphite-500 uppercase tracking-wide">{k.label}</p><p className="text-xl font-semibold mt-2">{k.value}</p></div>)}</div>
  <div className="flex flex-wrap gap-2 border-b border-graphite-700 pb-3">{([{id:'new',label:t('New report')},{id:'all',label:t('All orders')},{id:'pending',label:t('Pending orders')}] as {id:Tab;label:string}[]).map(t=><button key={t.id} onClick={()=>{setTab(t.id);setMessage('');setError('')}} className={`px-4 py-2 rounded text-sm ${tab===t.id?'bg-amber-500 text-graphite-950 font-semibold':'text-paper-200 hover:bg-graphite-800'}`}>{t.label}{t.id==='pending'&&<span className="ml-2 text-xs">{orders.filter(o=>o.status==='pending'||o.status==='in_progress').length}</span>}</button>)}</div>
  {message&&<div className="rounded border border-emerald-800 bg-emerald-950/40 text-emerald-300 px-4 py-3 text-sm">{message}</div>}
  {error&&<div className="rounded border border-red-800 bg-red-950/40 text-red-300 px-4 py-3 text-sm">{error}</div>}
  {tab==='new'&&<form onSubmit={createOrder} className="panel p-5 space-y-5">
   <div><h2 className="font-semibold">{t('New transaction')}</h2><p className="text-xs text-graphite-500 mt-1">{t('Each report records one order. Required fields are marked with *.')}</p></div>
   <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div><label className="label">{t('Branch *')}</label><select className="input" value={branchId} onChange={e=>setBranchId(e.target.value)} required><option value="">{t('Choose branch')}</option>{branches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select>{branches.length===0&&<p className="text-xs text-amber-400 mt-1">No active branches found. Ask an administrator to add a branch.</p>}</div><div><label className="label">{t('Client *')}</label><div className="flex gap-2"><select className="input flex-1" value={newClient?'__new__':accountId} onChange={e=>{if(e.target.value==='__new__'){setNewClient(true);setAccountId('')}else{setNewClient(false);setAccountId(e.target.value)}}} required={!newClient}><option value="">{t('Choose existing client')}</option>{accounts.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}<option value="__new__">{t('+ Add new client')}</option></select>{newClient&&<button type="button" className="btn-ghost" title="Use existing client" onClick={()=>setNewClient(false)}><X size={16}/></button>}</div></div></div>
   {newClient&&<div className="grid grid-cols-1 md:grid-cols-2 gap-4 rounded border border-graphite-700 p-4"><div><label className="label">{t('New client name *')}</label><input className="input" value={clientName} onChange={e=>setClientName(e.target.value)} required/></div><div><label className="label">{t('Client phone (optional)')}</label><input className="input" value={clientPhone} onChange={e=>setClientPhone(e.target.value)}/></div></div>}
   <div className="grid grid-cols-1 md:grid-cols-3 gap-4"><div><label className="label">{t('Process *')}</label><select className="input" value={process} onChange={e=>setProcess(e.target.value as Order['process'])}>{processes.map(p=><option key={p} value={p}>{titleCase(p)}</option>)}</select></div><div><label className="label">{t('Order status *')}</label><select className="input" value={status} onChange={e=>setStatus(e.target.value as Order['status'])}>{orderStatuses.map(s=><option key={s} value={s}>{titleCase(s)}</option>)}</select></div><div><label className="label">{t('Total amount *')}</label><input className="input" type="number" min="0" step="0.01" value={total} onChange={e=>setTotal(e.target.value)} required/></div></div>
   <div className="grid grid-cols-1 md:grid-cols-3 gap-4"><div><label className="label">{t('Initial payment')}</label><input className="input" type="number" min="0" step="0.01" value={initialPaid} onChange={e=>setInitialPaid(e.target.value)}/></div><div><label className="label">{t('Expected completion')}</label><input className="input" type="date" value={expectedDate} onChange={e=>setExpectedDate(e.target.value)}/></div><div className="rounded bg-graphite-800 p-3"><p className="text-xs text-graphite-500">{t('Remaining after initial payment')}</p><p className="text-lg font-semibold mt-1">{money(Math.max(0,(Number(total)||0)-(Number(initialPaid)||0)))}</p></div></div>
   {process==='rental'&&<div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div><label className="label">{t('Rental start date')}</label><input className="input" type="date" value={rentalStart} onChange={e=>setRentalStart(e.target.value)}/></div><div><label className="label">{t('Rental end date')}</label><input className="input" type="date" min={rentalStart||undefined} value={rentalEnd} onChange={e=>setRentalEnd(e.target.value)}/></div></div>}
   <div><label className="label">{t('Notes')}</label><textarea className="input min-h-24" value={notes} onChange={e=>setNotes(e.target.value)} placeholder={t('Order details or follow-up notes…')}/></div>
   <div className="flex justify-end"><button className="btn-primary flex items-center gap-2" disabled={saving||branches.length===0}>{saving?'Saving…':<><Plus size={16}/>{t('Create order')}</>}</button></div>
  </form>}
  {(tab==='all'||tab==='pending')&&<div className="space-y-3"><div className="flex flex-wrap gap-3"><div className="relative flex-1 min-w-48 max-w-sm"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-graphite-500"/><input className="input pl-9" placeholder={t('Search order number or client…')} value={search} onChange={e=>setSearch(e.target.value)}/></div><select className="input w-48" value={branchFilter} onChange={e=>setBranchFilter(e.target.value)}><option value="" >{t('All branches')}</option>{branches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select><select className="input w-44" value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}><option value="" >{t('All statuses')}</option><option value="pending_group">{t('Pending / In progress')}</option>{orderStatuses.map(s=><option key={s} value={s}>{titleCase(s)}</option>)}</select></div>
   <div className="panel overflow-x-auto"><table className="w-full text-sm min-w-[1050px]"><thead><tr className="border-b border-graphite-700 text-left text-xs uppercase text-graphite-500">{['Order','Date','Branch','Client','Process','Order status','Total','Paid','Balance','Payment status','Actions'].map(h=><th key={h} className="p-3 whitespace-nowrap">{t(h)}</th>)}</tr></thead><tbody>{loading?<tr><td colSpan={11} className="p-8 text-center text-graphite-500">{t('Loading orders…')}</td></tr>:visibleOrders.length===0?<tr><td colSpan={11} className="p-8 text-center text-graphite-500">{t('No matching orders.')}</td></tr>:visibleOrders.map(o=><tr key={o.id} className="border-b border-graphite-800 hover:bg-graphite-900/60"><td className="p-3 font-mono">#{o.order_number}</td><td className="p-3 whitespace-nowrap">{new Date(o.created_at).toLocaleDateString()}</td><td className="p-3">{branchNames.get(o.branch_id)||'—'}</td><td className="p-3 font-medium">{accountNames.get(o.account_id)||t('Unknown client')}</td><td className="p-3">{titleCase(o.process)}</td><td className="p-3"><select aria-label={`Status for order ${o.order_number}`} className="input py-1 text-xs min-w-32" value={o.status} onChange={e=>void updateStatus(o,e.target.value as Order['status'])}>{orderStatuses.map(s=><option key={s} value={s}>{titleCase(s)}</option>)}</select></td><td className="p-3 font-mono">{money(totalAmount(o))}</td><td className="p-3 font-mono">{money(paidAmount(o))}</td><td className="p-3 font-mono">{money(remaining(o))}</td><td className="p-3"><span className={`rounded px-2 py-1 text-xs ${paymentStatus(o)==='Paid'?'bg-emerald-950 text-emerald-300':paymentStatus(o)==='Partially paid'?'bg-amber-950 text-amber-300':'bg-graphite-800 text-graphite-300'}`}>{paymentStatus(o)}</span></td><td className="p-3"><button className="btn-ghost whitespace-nowrap" onClick={()=>{setSelected(o);setPaymentAmount('');setPaymentNote('');setError('')}}>{t('Record payment')}</button></td></tr>)}</tbody></table></div></div>}
  {selected&&<div className="fixed inset-0 z-50 flex justify-end bg-black/50"><div className="w-full max-w-md bg-graphite-900 border-l border-graphite-700 h-full p-6 flex flex-col overflow-y-auto"><div className="flex justify-between items-start mb-5"><div><h2 className="text-lg font-semibold">{t('Record payment')}</h2><p className="text-sm text-graphite-500 mt-1">Order #{selected.order_number} · {accountNames.get(selected.account_id)}</p></div><button className="btn-ghost" onClick={()=>setSelected(null)}><X size={17}/></button></div><div className="panel p-4 mb-5 space-y-2"><div className="flex justify-between text-sm"><span className="text-graphite-500">{t('Order total')}</span><span>{money(totalAmount(selected))}</span></div><div className="flex justify-between text-sm"><span className="text-graphite-500">{t('Paid so far')}</span><span>{money(paidAmount(selected))}</span></div><div className="flex justify-between font-semibold"><span>{t('Balance remaining')}</span><span>{money(remaining(selected))}</span></div></div>{remaining(selected)<=0&&<p className="text-sm text-emerald-400 mb-4">{t('This order is fully paid.')}</p>}<form onSubmit={addPayment} className="space-y-4"><div><label className="label">{t('Payment amount *')}</label><input className="input" type="number" min="0.01" max={remaining(selected)} step="0.01" value={paymentAmount} onChange={e=>setPaymentAmount(e.target.value)} required disabled={remaining(selected)<=0}/></div><div><label className="label">{t('Payment note (optional)')}</label><textarea className="input min-h-20" value={paymentNote} onChange={e=>setPaymentNote(e.target.value)}/></div><div className="mt-auto flex gap-2"><button type="button" className="btn-ghost flex-1" onClick={()=>setSelected(null)}>Cancel</button><button className="btn-primary flex-1" disabled={saving||remaining(selected)<=0}>{saving?'Saving…':'Save payment'}</button></div></form></div></div>}
 </div>
}