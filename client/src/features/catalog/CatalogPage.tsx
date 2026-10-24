import { useEffect, useState } from 'react'
import { Plus, RefreshCw, Search } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useI18n } from '../../lib/i18n'
import type { Tables } from '../../../../shared/database.types'

type Item = Tables<'catalog_items'>
type Category = Tables<'catalog_categories'>
type Kind = 'machine' | 'part'
export function CatalogPage() {
  const { t } = useI18n()
  const [kind, setKind] = useState<Kind>('part')
  const [items, setItems] = useState<Item[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [showCategory, setShowCategory] = useState(false)
  const [showItem, setShowItem] = useState(false)
  const [categoryCode, setCategoryCode] = useState('')
  const [categoryName, setCategoryName] = useState('')
  const [categoryDescription, setCategoryDescription] = useState('')
  const [itemCode, setItemCode] = useState('')
  const [itemName, setItemName] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [make, setMake] = useState('')
  const [model, setModel] = useState('')
  const [description, setDescription] = useState('')
  const [cost, setCost] = useState('')
  const [price, setPrice] = useState('')
  const [unit, setUnit] = useState('each')
  async function load() {
    setLoading(true); setError('')
    const [i, c] = await Promise.all([
      supabase.from('catalog_items').select('*').eq('item_type', kind).order('name'),
      supabase.from('catalog_categories').select('*').eq('item_type', kind).eq('is_active', true).order('name'),
    ])
    if (i.error || c.error) setError((i.error || c.error)?.message || '')
    setItems(i.data || []); setCategories(c.data || []); setLoading(false)
  }
  useEffect(() => { void load() }, [kind])
  const visible = items.filter(i => [i.item_code, i.name, i.make || '', i.model || ''].some(v => v.toLowerCase().includes(search.trim().toLowerCase())))
  async function addCategory(e: React.FormEvent) {
    e.preventDefault(); setError(''); setNotice('')
    if (!categoryCode.trim() || !categoryName.trim()) { setError(t('Category code and name are required.')); return }
    setSaving(true)
    const { error: e2 } = await supabase.from('catalog_categories').insert({ code: categoryCode.trim().toUpperCase(), name: categoryName.trim(), item_type: kind, description: categoryDescription.trim() || null })
    setSaving(false)
    if (e2) { setError(e2.message); return }
    setNotice(t('Category created.')); setCategoryCode(''); setCategoryName(''); setCategoryDescription(''); setShowCategory(false); void load()
  }
  async function addItem(e: React.FormEvent) {
    e.preventDefault(); setError(''); setNotice('')
    if (!itemCode.trim() || !itemName.trim()) { setError(t('Item code and name are required.')); return }
    setSaving(true)
    const { error: e2 } = await supabase.from('catalog_items').insert({
      item_code: itemCode.trim().toUpperCase(), item_type: kind, name: itemName.trim(),
      category_id: categoryId || null, make: make.trim() || null, model: model.trim() || null,
      description: description.trim() || null, unit, cost_price: cost ? Number(cost) : null,
      sale_price: price ? Number(price) : null,
    })
    setSaving(false)
    if (e2) { setError(e2.message); return }
    setNotice(t('Catalogue item created.')); setItemCode(''); setItemName(''); setCategoryId(''); setMake(''); setModel(''); setDescription(''); setCost(''); setPrice(''); setUnit('each'); setShowItem(false); void load()
  }
  return <div className="p-5 md:p-6 max-w-[1500px] mx-auto space-y-5">
    <header className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-xl font-semibold">{t('Machines & Parts Catalogue')}</h1><p className="text-sm text-graphite-500 mt-1">{t('Maintain the company item codes used to identify machines and spare parts across the system.')}</p></div><button className="btn-ghost flex items-center gap-2" onClick={() => void load()}><RefreshCw size={15}/>{t('Refresh')}</button></header>
    <div className="flex flex-wrap gap-2 border-b border-graphite-700 pb-3"><button className={`px-4 py-2 rounded text-sm ${kind === 'machine' ? 'bg-amber-500 text-graphite-950 font-semibold' : 'text-paper-200 hover:bg-graphite-800'}`} onClick={() => setKind('machine')}>{t('Machines')}</button><button className={`px-4 py-2 rounded text-sm ${kind === 'part' ? 'bg-amber-500 text-graphite-950 font-semibold' : 'text-paper-200 hover:bg-graphite-800'}`} onClick={() => setKind('part')}>{t('Parts')}</button></div>
    {notice && <div className="rounded border border-emerald-800 bg-emerald-950/40 text-emerald-300 px-4 py-3 text-sm">{notice}</div>}{error && <div className="rounded border border-red-800 bg-red-950/40 text-red-300 px-4 py-3 text-sm">{error}</div>}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3"><div className="panel p-4"><p className="text-xs text-graphite-500">{t('Active catalogue items')}</p><p className="text-2xl font-semibold mt-1">{items.filter(i => i.is_active).length}</p></div><div className="panel p-4"><p className="text-xs text-graphite-500">{t('Categories')}</p><p className="text-2xl font-semibold mt-1">{categories.length}</p></div><div className="panel p-4"><p className="text-xs text-graphite-500">{t('Item type')}</p><p className="text-2xl font-semibold mt-1">{t(kind === 'machine' ? 'Machines' : 'Parts')}</p></div></div>
    <div className="panel p-4 flex flex-wrap items-center justify-between gap-3"><div className="relative flex-1 min-w-48 max-w-md"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-graphite-500"/><input className="input pl-9" placeholder={t('Search by company code, name, make, or model…')} value={search} onChange={e => setSearch(e.target.value)}/></div><div className="flex gap-2"><button className="btn-ghost flex items-center gap-2" onClick={() => setShowCategory(v => !v)}><Plus size={15}/>{t('Add category')}</button><button className="btn-primary flex items-center gap-2" onClick={() => setShowItem(v => !v)}><Plus size={15}/>{t('Add item')}</button></div></div>
    {showCategory && <form onSubmit={addCategory} className="panel p-4 space-y-3"><h2 className="font-semibold">{t('New category')}</h2><div className="grid grid-cols-1 md:grid-cols-3 gap-3"><div><label className="label">{t('Category code *')}</label><input className="input" value={categoryCode} onChange={e => setCategoryCode(e.target.value)} required placeholder="CAT-0001"/></div><div><label className="label">{t('Category name *')}</label><input className="input" value={categoryName} onChange={e => setCategoryName(e.target.value)} required/></div><div><label className="label">{t('Description')}</label><input className="input" value={categoryDescription} onChange={e => setCategoryDescription(e.target.value)}/></div></div><div className="flex justify-end gap-2"><button type="button" className="btn-ghost" onClick={() => setShowCategory(false)}>{t('Cancel')}</button><button className="btn-primary" disabled={saving}>{saving ? t('Saving…') : t('Save category')}</button></div></form>}
    {showItem && <form onSubmit={addItem} className="panel p-4 space-y-3"><h2 className="font-semibold">{kind === 'machine' ? t('Add machine') : t('Add part')}</h2><div className="grid grid-cols-1 md:grid-cols-3 gap-3"><div><label className="label">{t('Company item code *')}</label><input className="input" value={itemCode} onChange={e => setItemCode(e.target.value)} required placeholder={kind === 'machine' ? 'MCH-00001' : 'PRT-00001'}/></div><div><label className="label">{t('Item name *')}</label><input className="input" value={itemName} onChange={e => setItemName(e.target.value)} required/></div><div><label className="label">{t('Category')}</label><select className="input" value={categoryId} onChange={e => setCategoryId(e.target.value)}><option value="">{t('Uncategorised')}</option>{categories.map(c => <option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}</select></div><div><label className="label">{t('Make / manufacturer')}</label><input className="input" value={make} onChange={e => setMake(e.target.value)}/></div><div><label className="label">{t('Model')}</label><input className="input" value={model} onChange={e => setModel(e.target.value)}/></div><div><label className="label">{t('Unit')}</label><select className="input" value={unit} onChange={e => setUnit(e.target.value)}><option value="each">{t('Each')}</option><option value="set">{t('Set')}</option><option value="meter">{t('Meter')}</option><option value="liter">{t('Liter')}</option><option value="kg">{t('Kilogram')}</option></select></div><div><label className="label">{t('Cost price')}</label><input className="input" type="number" min="0" step="0.01" value={cost} onChange={e => setCost(e.target.value)}/></div><div><label className="label">{t('Sale price')}</label><input className="input" type="number" min="0" step="0.01" value={price} onChange={e => setPrice(e.target.value)}/></div><div><label className="label">{t('Description')}</label><input className="input" value={description} onChange={e => setDescription(e.target.value)}/></div></div><div className="flex justify-end gap-2"><button type="button" className="btn-ghost" onClick={() => setShowItem(false)}>{t('Cancel')}</button><button className="btn-primary" disabled={saving}>{saving ? t('Saving…') : t('Save item')}</button></div></form>}
    <div className="panel overflow-x-auto"><table className="w-full text-sm min-w-[850px]"><thead><tr className="text-left text-xs uppercase text-graphite-500 border-b border-graphite-700">{['Code','Name','Category','Make','Model','Cost','Price','Status'].map(h => <th key={h} className="p-3">{t(h)}</th>)}</tr></thead><tbody>{loading ? <tr><td colSpan={8} className="p-6 text-center">{t('Loading…')}</td></tr> : visible.map(item => <tr key={item.id} className="border-b border-graphite-800"><td className="p-3 font-mono text-amber-400">{item.item_code}</td><td className="p-3 font-medium">{item.name}</td><td className="p-3">{categories.find(c => c.id === item.category_id)?.name || '—'}</td><td className="p-3">{item.make || '—'}</td><td className="p-3">{item.model || '—'}</td><td className="p-3">{item.cost_price == null ? '—' : Number(item.cost_price).toLocaleString()}</td><td className="p-3">{item.sale_price == null ? '—' : Number(item.sale_price).toLocaleString()}</td><td className="p-3">{item.is_active ? t('Active') : t('Inactive')}</td></tr>)}</tbody></table></div>
  </div>
}
