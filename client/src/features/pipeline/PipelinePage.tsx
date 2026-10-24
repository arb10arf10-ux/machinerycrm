import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, Plus, RefreshCw, Search, ShoppingCart, Target } from 'lucide-react'
import clsx from 'clsx'
import { supabase } from '../../lib/supabase'
import { StatusChip } from '../../components/StatusChip'
import { useAuth } from '../../lib/auth'
import { useI18n } from '../../lib/i18n'
import type { Tables } from '../../../../shared/database.types'

type Opportunity = Tables<'opportunities'> & { accounts?: { name: string } | null }
type Order = Tables<'orders'> & { accounts?: { name: string } | null; locations?: { name: string } | null }
type OpportunityStage = Opportunity['stage']
type OrderStatus = Order['status']
const stages: { key: OpportunityStage; label: string }[] = [
  { key: 'lead', label: 'Lead' }, { key: 'qualified', label: 'Qualified' },
  { key: 'proposal', label: 'Proposal' }, { key: 'negotiation', label: 'Negotiation' },
  { key: 'won', label: 'Won' }, { key: 'lost', label: 'Lost' },
]
const orderStages: { key: OrderStatus; label: string }[] = [
  { key: 'pending', label: 'Pending' }, { key: 'in_progress', label: 'In progress' },
  { key: 'fulfilled', label: 'Fulfilled' }, { key: 'cancelled', label: 'Cancelled' },
]
const types = ['sale', 'rental', 'service', 'parts'] as const
const money = (value: number) => new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value || 0)

export function PipelinePage() {
  const { t } = useI18n()
  const { profile } = useAuth()
  const [view, setView] = useState<'opportunities' | 'orders'>('orders')
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [accounts, setAccounts] = useState<{ id: string; name: string }[]>([])
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [branchFilter, setBranchFilter] = useState('')
  const [show, setShow] = useState(false)
  const [name, setName] = useState('')
  const [accountId, setAccountId] = useState('')
  const [kind, setKind] = useState<'sale' | 'rental' | 'service' | 'parts'>('sale')
  const [amount, setAmount] = useState('')
  const [stage, setStage] = useState<OpportunityStage>('lead')

  async function load() {
    setLoading(true); setError('')
    const [o, r, a, b] = await Promise.all([
      supabase.from('opportunities').select('*, accounts(name)').order('updated_at', { ascending: false }),
      supabase.from('orders').select('*, accounts(name), locations(name)').order('created_at', { ascending: false }),
      supabase.from('accounts').select('id,name').eq('is_active', true).order('name'),
      supabase.from('locations').select('id,name').eq('is_active', true).eq('type', 'branch').order('name'),
    ])
    const failure = o.error || r.error || a.error || b.error
    if (failure) setError(failure.message)
    setOpportunities((o.data as Opportunity[]) || [])
    setOrders((r.data as Order[]) || [])
    setAccounts(a.data || [])
    setBranches(b.data || [])
    setLoading(false)
  }
  useEffect(() => { void load() }, [])

  const filteredOpportunities = useMemo(() => opportunities.filter(o => {
    const query = search.trim().toLowerCase()
    return (!query || o.name.toLowerCase().includes(query) || (o.accounts?.name || '').toLowerCase().includes(query))
      && (!typeFilter || o.opportunity_type === typeFilter)
  }), [opportunities, search, typeFilter])
  const filteredOrders = useMemo(() => orders.filter(o => {
    const query = search.trim().toLowerCase()
    return (!query || String(o.order_number).includes(query) || (o.accounts?.name || '').toLowerCase().includes(query))
      && (!typeFilter || o.process === typeFilter)
      && (!branchFilter || o.branch_id === branchFilter)
  }), [orders, search, typeFilter, branchFilter])

  async function createOpportunity() {
    setError(''); setNotice('')
    if (!name.trim() || !accountId || !profile) { setError(t('Enter an opportunity name and choose a client.')); return }
    setSaving(true)
    const { error: e } = await supabase.from('opportunities').insert({
      name: name.trim(), account_id: accountId, owner_id: profile.id,
      opportunity_type: kind, amount: amount ? Number(amount) : 0, stage,
      branch_id: profile.branch_id,
    })
    setSaving(false)
    if (e) { setError(e.message); return }
    setNotice(t('Opportunity created.')); setShow(false); setName(''); setAccountId(''); setAmount(''); setStage('lead'); void load()
  }
  async function moveOpportunity(row: Opportunity, next: OpportunityStage) {
    setError(''); setNotice('')
    const { error: e } = await supabase.from('opportunities').update({ stage: next }).eq('id', row.id)
    if (e) setError(e.message); else { setNotice(t('Opportunity stage updated.')); void load() }
  }
  async function convertToOrder(row: Opportunity) {
    if (!profile) return
    if (!profile.branch_id) { setError(t('Assign a branch to your employee account before converting an opportunity to an order.')); return }
    if (!window.confirm(t('Convert this opportunity into an order? This creates a new order and links it to the opportunity.'))) return
    setSaving(true); setError(''); setNotice('')
    const { data: order, error: orderError } = await supabase.from('orders').insert({
      branch_id: profile.branch_id, account_id: row.account_id, created_by: profile.id,
      process: row.opportunity_type, status: 'pending', total_amount: Number(row.amount || 0),
      notes: t('Created from opportunity: ') + row.name,
    }).select('*').single()
    if (orderError || !order) { setSaving(false); setError(orderError?.message || t('Could not create order.')); return }
    const { error: linkError } = await supabase.from('opportunities').update({ stage: 'won', order_id: order.id }).eq('id', row.id)
    setSaving(false)
    if (linkError) { setError(t('Order created, but linking the opportunity failed: ') + linkError.message); void load(); return }
    setNotice(t('Opportunity converted to order successfully.')); setView('orders'); void load()
  }
  async function moveOrder(row: Order, next: OrderStatus) {
    setError(''); setNotice('')
    const { error: e } = await supabase.from('orders').update({ status: next }).eq('id', row.id)
    if (e) setError(e.message); else { setNotice(t('Order status updated.')); void load() }
  }

  return <div className="p-5 md:p-6 max-w-[1800px] mx-auto space-y-5">
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div><h1 className="text-xl font-semibold">{t('Pipeline')}</h1><p className="text-sm text-graphite-500 mt-1">{t('Track potential sales from first contact through conversion, then follow the order through delivery.')}</p></div>
      <div className="flex flex-wrap items-center gap-2"><button className="btn-ghost flex items-center gap-2" onClick={() => void load()}><RefreshCw size={15}/>{t('Refresh')}</button>{view === 'opportunities' && <button className="btn-primary flex items-center gap-2" onClick={() => setShow(true)}><Plus size={16}/>{t('New opportunity')}</button>}</div>
    </header>
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <button onClick={() => setView('opportunities')} className={clsx('panel p-4 text-left', view === 'opportunities' && 'border-amber-500')}><div className="flex items-center gap-2 text-sm text-graphite-400"><Target size={16}/>{t('Open opportunities')}</div><div className="text-2xl font-semibold mt-2">{opportunities.filter(o => !['won','lost'].includes(o.stage)).length}</div><div className="text-xs text-graphite-500 mt-1">{money(opportunities.filter(o => !['won','lost'].includes(o.stage)).reduce((s,o) => s + Number(o.amount || 0), 0))} {t('potential value')}</div></button>
      <button onClick={() => setView('orders')} className={clsx('panel p-4 text-left', view === 'orders' && 'border-amber-500')}><div className="flex items-center gap-2 text-sm text-graphite-400"><ShoppingCart size={16}/>{t('Active orders')}</div><div className="text-2xl font-semibold mt-2">{orders.filter(o => ['pending','in_progress'].includes(o.status)).length}</div><div className="text-xs text-graphite-500 mt-1">{t('Pending action or in progress')}</div></button>
      <div className="panel p-4"><div className="text-sm text-graphite-400">{t('Completed orders')}</div><div className="text-2xl font-semibold mt-2">{orders.filter(o => o.status === 'fulfilled').length}</div><div className="text-xs text-graphite-500 mt-1">{t('Orders marked as fulfilled')}</div></div>
    </div>
    <div className="flex flex-wrap gap-2 border-b border-graphite-700 pb-3">
      <button className={clsx('px-4 py-2 rounded text-sm', view === 'orders' ? 'bg-amber-500 text-graphite-950 font-semibold' : 'text-paper-200 hover:bg-graphite-800')} onClick={() => setView('orders')}>{t('Orders')}</button>
      <button className={clsx('px-4 py-2 rounded text-sm', view === 'opportunities' ? 'bg-amber-500 text-graphite-950 font-semibold' : 'text-paper-200 hover:bg-graphite-800')} onClick={() => setView('opportunities')}>{t('Sales opportunities')}</button>
    </div>
    {notice && <div className="rounded border border-emerald-800 bg-emerald-950/40 text-emerald-300 px-4 py-3 text-sm">{notice}</div>}
    {error && <div className="rounded border border-red-800 bg-red-950/40 text-red-300 px-4 py-3 text-sm">{error}</div>}
    <div className="flex flex-wrap gap-3">
      <div className="relative flex-1 min-w-48 max-w-md"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-graphite-500"/><input className="input pl-9" placeholder={t('Search by order number, opportunity, or client…')} value={search} onChange={e => setSearch(e.target.value)}/></div>
      <select className="input w-44" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}><option value="">{t('All types')}</option>{types.map(type => <option key={type} value={type}>{t(type)}</option>)}</select>
      {view === 'orders' && profile?.can_view_all_branches && <select className="input w-48" value={branchFilter} onChange={e => setBranchFilter(e.target.value)}><option value="">{t('All branches')}</option>{branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select>}
    </div>
    {loading ? <div className="panel p-8 text-center text-graphite-500">{t('Loading…')}</div> : view === 'orders' ? <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 items-start">
      {orderStages.map(col => { const items = filteredOrders.filter(o => o.status === col.key); return <section key={col.key} className="panel overflow-hidden min-h-52"><header className="p-3 border-b border-graphite-700 flex items-center justify-between"><h2 className="text-sm font-semibold">{t(col.label)}</h2><span className="text-xs rounded bg-graphite-800 px-2 py-1">{items.length}</span></header><div className="p-2 space-y-2">{items.map(o => <article key={o.id} className="rounded border border-graphite-700 bg-graphite-800/70 p-3"><div className="flex justify-between gap-2"><strong className="text-sm">#{o.order_number}</strong><span className="text-xs text-amber-400">{money(Number(o.total_amount || 0))}</span></div><p className="mt-1 text-sm">{o.accounts?.name || '—'}</p><p className="text-xs text-graphite-500 mt-1">{o.locations?.name || branches.find(b => b.id === o.branch_id)?.name || ''} · {t(o.process)}</p>{o.expected_completion_date && <p className="text-xs text-graphite-400 mt-2">{t('Expected')}: {o.expected_completion_date}</p>}<div className="mt-3 flex flex-wrap gap-1">{orderStages.filter(s => s.key !== o.status).map(next => <button key={next.key} disabled={saving} onClick={() => void moveOrder(o,next.key)} className="text-xs px-2 py-1 rounded bg-graphite-700 hover:bg-graphite-600 disabled:opacity-50">{t(next.label)} →</button>)}</div></article>)}{items.length === 0 && <p className="text-xs text-graphite-500 p-2">{t('No orders in this stage.')}</p>}</div></section>})}
    </div> : <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 items-start">
      {stages.map(col => { const items = filteredOpportunities.filter(o => o.stage === col.key); return <section key={col.key} className="panel overflow-hidden min-h-52"><header className="p-3 border-b border-graphite-700 flex items-center justify-between"><h2 className="text-sm font-semibold">{t(col.label)}</h2><span className="text-xs rounded bg-graphite-800 px-2 py-1">{items.length}</span></header><div className="p-2 space-y-2">{items.map(o => <article key={o.id} className="rounded border border-graphite-700 bg-graphite-800/70 p-3"><strong className="text-sm">{o.name}</strong><p className="mt-1 text-sm text-graphite-400">{o.accounts?.name || '—'}</p><div className="flex items-center justify-between mt-2"><span className="text-xs text-amber-400">{money(Number(o.amount || 0))}</span><StatusChip status={o.opportunity_type} className="text-[10px]"/></div>{o.order_id && <p className="text-xs text-emerald-400 mt-2">{t('Linked order created')}</p>}<div className="mt-3 flex flex-wrap gap-1">{col.key !== 'won' && col.key !== 'lost' && <button disabled={saving} onClick={() => void convertToOrder(o)} className="text-xs px-2 py-1 rounded bg-amber-500 text-graphite-950 disabled:opacity-50 flex items-center gap-1"><ArrowRight size={12}/>{t('Convert to order')}</button>}{stages.filter(s => s.key !== o.stage).map(next => <button key={next.key} disabled={saving} onClick={() => void moveOpportunity(o,next.key)} className="text-xs px-2 py-1 rounded bg-graphite-700 hover:bg-graphite-600 disabled:opacity-50">{t(next.label)}</button>)}</div></article>)}{items.length === 0 && <p className="text-xs text-graphite-500 p-2">{t('No opportunities in this stage.')}</p>}</div></section>})}
    </div>}
    {show && <div className="fixed inset-0 z-50 flex justify-end bg-black/40"><div className="w-full max-w-md bg-graphite-900 border-l border-graphite-700 h-full p-6 flex flex-col overflow-y-auto"><h2 className="text-lg font-semibold mb-4">{t('New opportunity')}</h2><label className="label">{t('Opportunity name *')}</label><input className="input mb-4" value={name} onChange={e => setName(e.target.value)} required/><label className="label">{t('Client *')}</label><select className="input mb-4" value={accountId} onChange={e => setAccountId(e.target.value)} required><option value="">{t('Select client…')}</option>{accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select><div className="grid grid-cols-2 gap-3 mb-4"><div><label className="label">{t('Type')}</label><select className="input" value={kind} onChange={e => setKind(e.target.value as typeof kind)}>{types.map(type => <option key={type} value={type}>{t(type)}</option>)}</select></div><div><label className="label">{t('Stage')}</label><select className="input" value={stage} onChange={e => setStage(e.target.value as OpportunityStage)}>{stages.map(s => <option key={s.key} value={s.key}>{t(s.label)}</option>)}</select></div></div><label className="label">{t('Expected amount (USD)')}</label><input className="input" type="number" min="0" step="0.01" value={amount} onChange={e => setAmount(e.target.value)}/><div className="mt-auto flex gap-2 pt-5"><button className="btn-ghost flex-1" onClick={() => setShow(false)}>{t('Cancel')}</button><button className="btn-primary flex-1" disabled={saving} onClick={() => void createOpportunity()}>{saving ? t('Saving…') : t('Create opportunity')}</button></div></div></div>}
  </div>
}
