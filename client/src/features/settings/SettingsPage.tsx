import { useEffect, useState } from 'react'
import { Building2, Users, UserPlus, Plus, RefreshCw, Save, ShieldCheck, BriefcaseBusiness } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth'
import type { Tables } from '../../../../shared/database.types'
import {useI18n} from '../../lib/i18n'

type Profile=Tables<'profiles'>
type Account=Tables<'accounts'>
type Location=Tables<'locations'>
type Tab='employees'|'branches'|'accounts'
const roles:Profile['role'][]=['admin','sales','operations','service','parts','viewer']
const accountTypes:Account['account_type'][]=['customer','prospect','dealer','internal']
const moneyless=(s:string)=>s.replace(/_/g,' ').replace(/\b\w/g,(c:string)=>c.toUpperCase())
const field='input'
export function SettingsPage(){
 const {t}=useI18n()
 const {profile}=useAuth()
 const [tab,setTab]=useState<Tab>('employees')
 const [employees,setEmployees]=useState<Profile[]>([])
 const [accounts,setAccounts]=useState<Account[]>([])
 const [branches,setBranches]=useState<Location[]>([])
 const [loading,setLoading]=useState(true)
 const [saving,setSaving]=useState(false)
 const [error,setError]=useState('')
 const [notice,setNotice]=useState('')
 const [employeeEmail,setEmployeeEmail]=useState('')
 const [employeeName,setEmployeeName]=useState('')
 const [employeePassword,setEmployeePassword]=useState('')
 const [employeeRole,setEmployeeRole]=useState<Profile['role']>('sales')
 const [branchCode,setBranchCode]=useState('')
 const [branchName,setBranchName]=useState('')
 const [branchCity,setBranchCity]=useState('')
 const [branchCountry,setBranchCountry]=useState('US')
 const [accountName,setAccountName]=useState('')
 const [accountType,setAccountType]=useState<Account['account_type']>('customer')
 const [accountPhone,setAccountPhone]=useState('')
 const [accountEmail,setAccountEmail]=useState('')
 const [editingRoles,setEditingRoles]=useState<Record<string,Profile['role']>>({})
 async function load(){
  setLoading(true);setError('')
  const [p,a,b]=await Promise.all([
   supabase.from('profiles').select('*').order('created_at',{ascending:false}),
   supabase.from('accounts').select('*').order('name'),
   supabase.from('locations').select('*').order('name')
  ])
  const fail=p.error||a.error||b.error
  if(fail)setError(fail.message)
  setEmployees(p.data||[]);setAccounts(a.data||[]);setBranches(b.data||[])
  setLoading(false)
 }
 useEffect(()=>{void load()},[])
 function resetMessages(){setError('');setNotice('')}
 async function invokeEmployee(body:Record<string,unknown>){
  const {data:{session}}=await supabase.auth.getSession()
  if(!session?.access_token)throw new Error(t('Your session expired. Sign in again.'))
  const response=await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-employee`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`,apikey:import.meta.env.VITE_SUPABASE_ANON_KEY},body:JSON.stringify(body)})
  const result=await response.json()
  if(!response.ok)throw new Error(result.error||t('Employee management request failed.'))
  return result
 }
 async function createEmployee(e:React.FormEvent){
  e.preventDefault();resetMessages()
  if(!employeeName.trim()||!employeeEmail.trim()||employeePassword.length<10){setError(t('Enter a name, email, and a temporary password with at least 10 characters.'));return}
  setSaving(true)
  try{
   await invokeEmployee({action:'create',email:employeeEmail.trim(),password:employeePassword,full_name:employeeName.trim(),role:employeeRole})
   setNotice(t('Employee account created. Share the temporary password with them securely.'))
   setEmployeeEmail('');setEmployeeName('');setEmployeePassword('');setEmployeeRole('sales');await load()
  }catch(e){setError(e instanceof Error?e.message:'Could not create employee.')}
  finally{setSaving(false)}
 }
 async function saveRole(employee:Profile){
  resetMessages()
  const role=editingRoles[employee.id]||employee.role
  if(role==='admin'&&profile?.id!==employee.id&&!window.confirm(t('Admin access gives full control of employees, branches, accounts, and operational records. Continue?')))return
  setSaving(true)
  try{await invokeEmployee({action:'update',user_id:employee.id,role,is_active:employee.is_active});setNotice(t('Employee permissions updated.'));await load()}
  catch(e){setError(e instanceof Error?e.message:'Could not update employee.')}
  finally{setSaving(false)}
 }
 async function toggleEmployee(employee:Profile){
  if(employee.id===profile?.id){setError(t('You cannot deactivate your own account.'));return}
  if(!window.confirm(`${employee.is_active?t('Deactivate'):t('Reactivate')} ${employee.full_name||employee.email}?`))return
  resetMessages();setSaving(true)
  try{await invokeEmployee({action:'update',user_id:employee.id,role:employee.role,is_active:!employee.is_active});setNotice(t('Employee status updated.'));await load()}
  catch(e){setError(e instanceof Error?e.message:'Could not update employee.')}
  finally{setSaving(false)}
 }
 async function createBranch(e:React.FormEvent){
  e.preventDefault();resetMessages()
  if(!branchCode.trim()||!branchName.trim()){setError(t('Branch code and name are required.'));return}
  setSaving(true)
  const {error:e2}=await supabase.from('locations').insert({code:branchCode.trim().toUpperCase(),name:branchName.trim(),type:'branch',city:branchCity.trim()||null,country:branchCountry.trim()||null})
  setSaving(false)
  if(e2){setError(e2.message);return}
  setNotice(t('Branch added.'));setBranchCode('');setBranchName('');setBranchCity('');await load()
 }
 async function toggleBranch(branch:Location){
  if(!window.confirm(`${branch.is_active?'Deactivate':'Reactivate'} branch ${branch.name}?`))return
  resetMessages()
  const {error:e}=await supabase.from('locations').update({is_active:!branch.is_active}).eq('id',branch.id)
  if(e){setError(e.message);return}
  setNotice(t('Branch status updated.'));await load()
 }
 async function createAccount(e:React.FormEvent){
  e.preventDefault();resetMessages()
  if(!accountName.trim()){setError(t('Account name is required.'));return}
  setSaving(true)
  const {error:e2}=await supabase.from('accounts').insert({name:accountName.trim(),account_type:accountType,phone:accountPhone.trim()||null,website:accountEmail.trim()||null,owner_id:profile?.id||null})
  setSaving(false)
  if(e2){setError(e2.message);return}
  setNotice(t('Account added.'));setAccountName('');setAccountPhone('');setAccountEmail('');setAccountType('customer');await load()
 }
 async function toggleAccount(account:Account){
  if(!window.confirm(`${account.is_active?'Deactivate':'Reactivate'} account ${account.name}?`))return
  resetMessages()
  const {error:e}=await supabase.from('accounts').update({is_active:!account.is_active}).eq('id',account.id)
  if(e){setError(e.message);return}
  setNotice(t('Account status updated.'));await load()
 }
 if(profile?.role!=='admin')return <div className="p-6"><h1 className="text-xl font-semibold">{t('Settings')}</h1><div className="panel p-5 mt-4 text-sm text-graphite-300">{t('This control panel is restricted to administrators. Ask your system administrator to grant your account the admin role.')}</div></div>
 const tabs=[{id:'employees' as const,label:t('Employees'),icon:Users,count:employees.length},{id:'branches' as const,label:t('Branches'),icon:Building2,count:branches.length},{id:'accounts' as const,label:t('Accounts'),icon:BriefcaseBusiness,count:accounts.length}]
 return <div className="p-6 max-w-[1500px] mx-auto space-y-5">
  <header className="flex flex-wrap justify-between items-center gap-3"><div><h1 className="text-xl font-semibold">{t('Control Panel')}</h1><p className="text-sm text-graphite-500 mt-1">{t('Manage employees, access levels, branches, and client accounts without opening Supabase.')}</p></div><button className="btn-ghost flex items-center gap-2" onClick={()=>void load()}><RefreshCw size={15}/>{t('Refresh')}</button></header>
  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">{[{label:t('Employees'),value:employees.filter(x=>x.is_active).length,icon:Users},{label:t('Active branches'),value:branches.filter(x=>x.is_active).length,icon:Building2},{label:t('Active accounts'),value:accounts.filter(x=>x.is_active).length,icon:BriefcaseBusiness}].map(x=><div key={x.label} className="panel p-4 flex gap-3 items-center"><div className="rounded bg-graphite-800 p-2"><x.icon size={18}/></div><div><p className="text-xs text-graphite-500">{x.label}</p><p className="text-xl font-semibold">{x.value}</p></div></div>)}</div>
  <div className="flex flex-wrap gap-2 border-b border-graphite-700 pb-3">{tabs.map(t=><button key={t.id} onClick={()=>{setTab(t.id);resetMessages()}} className={`flex items-center gap-2 rounded px-4 py-2 text-sm ${tab===t.id?'bg-amber-500 text-graphite-950 font-semibold':'text-paper-200 hover:bg-graphite-800'}`}><t.icon size={16}/>{t.label}<span className="text-xs">{t.count}</span></button>)}</div>
  {notice&&<div className="rounded border border-emerald-800 bg-emerald-950/40 text-emerald-300 px-4 py-3 text-sm">{notice}</div>}
  {error&&<div className="rounded border border-red-800 bg-red-950/40 text-red-300 px-4 py-3 text-sm">{error}</div>}
  {tab==='employees'&&<div className="space-y-5">
   <form onSubmit={createEmployee} className="panel p-5 space-y-4"><div className="flex items-center gap-2"><UserPlus size={18}/><div><h2 className="font-semibold">{t('Add employee')}</h2><p className="text-xs text-graphite-500 mt-1">Create a login and assign the employee's access level.</p></div></div><div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4"><div><label className="label">{t('Full name *')}</label><input className={field} value={employeeName} onChange={e=>setEmployeeName(e.target.value)} required/></div><div><label className="label">{t('Email / login *')}</label><input className={field} type="email" value={employeeEmail} onChange={e=>setEmployeeEmail(e.target.value)} required/></div><div><label className="label">{t('Temporary password *')}</label><input className={field} type="password" minLength={10} autoComplete="new-password" value={employeePassword} onChange={e=>setEmployeePassword(e.target.value)} required/><p className="text-xs text-graphite-500 mt-1">{t('At least 10 characters')}</p></div><div><label className="label">{t('Role *')}</label><select className={field} value={employeeRole} onChange={e=>setEmployeeRole(e.target.value as Profile['role'])}>{roles.map(r=><option key={r} value={r}>{t(moneyless(r))}</option>)}</select></div></div><div className="flex justify-end"><button className="btn-primary flex items-center gap-2" disabled={saving}>{saving?'Creating…':<><Plus size={16}/>{t('Create employee')}</>}</button></div></form>
   <div className="panel overflow-x-auto"><table className="w-full text-sm min-w-[850px]"><thead><tr className="text-left text-xs uppercase text-graphite-500 border-b border-graphite-700">{['Employee','Role','Status','Joined','Actions'].map(h=><th className="p-3" key={h}>{h}</th>)}</tr></thead><tbody>{loading?<tr><td colSpan={5} className="p-6 text-center">{t('Loading employees…')}</td></tr>:employees.map(employee=><tr key={employee.id} className="border-b border-graphite-800"><td className="p-3"><p className="font-medium">{employee.full_name||t('Name not set')}</p><p className="text-xs text-graphite-500">{employee.email}</p></td><td className="p-3"><select className="input py-1 max-w-40" value={editingRoles[employee.id]||employee.role} onChange={e=>setEditingRoles(prev=>({...prev,[employee.id]:e.target.value as Profile['role']}))} disabled={!employee.is_active}><option value={employee.role}>{t(moneyless(employee.role))}</option>{roles.filter(r=>r!==employee.role).map(r=><option key={r} value={r}>{t(moneyless(r))}</option>)}</select></td><td className="p-3"><span className={`rounded px-2 py-1 text-xs ${employee.is_active?'bg-emerald-950 text-emerald-300':'bg-graphite-800 text-graphite-400'}`}>{employee.is_active?t('Active'):t('Inactive')}</span></td><td className="p-3 whitespace-nowrap">{new Date(employee.created_at).toLocaleDateString()}</td><td className="p-3"><div className="flex gap-2"><button className="btn-ghost" disabled={saving} onClick={()=>void saveRole(employee)}><Save size={14}/> {t('Save role')}</button><button className="btn-ghost" disabled={saving||employee.id===profile.id} onClick={()=>void toggleEmployee(employee)}>{employee.is_active?t('Deactivate'):t('Reactivate')}</button></div></td></tr>)}</tbody></table></div>
   <div className="rounded border border-graphite-700 p-4 text-xs text-graphite-400 flex gap-2"><ShieldCheck size={16} className="shrink-0 text-amber-400"/><p>Admins have full control. Sales can manage sales workflows; Operations can manage operational records; Service and Parts are department roles; Viewer is read-only. Deactivating an employee blocks app access. The employee's login remains in the authentication system for audit/history.</p></div>
  </div>}
  {tab==='branches'&&<div className="space-y-5"><form onSubmit={createBranch} className="panel p-5 space-y-4"><div><h2 className="font-semibold">{t('Add branch')}</h2><p className="text-xs text-graphite-500 mt-1">Branches are available in order reports and can be managed here.</p></div><div className="grid grid-cols-1 md:grid-cols-4 gap-4"><div><label className="label">{t('Branch code *')}</label><input className={field} value={branchCode} onChange={e=>setBranchCode(e.target.value)} required/></div><div><label className="label">{t('Branch name *')}</label><input className={field} value={branchName} onChange={e=>setBranchName(e.target.value)} required/></div><div><label className="label">{t('City')}</label><input className={field} value={branchCity} onChange={e=>setBranchCity(e.target.value)}/></div><div><label className="label">{t('Country')}</label><input className={field} value={branchCountry} onChange={e=>setBranchCountry(e.target.value)}/></div></div><div className="flex justify-end"><button className="btn-primary" disabled={saving}>{saving?'Saving…':t('Add branch')}</button></div></form><div className="panel overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left text-xs uppercase text-graphite-500 border-b border-graphite-700">{['Code','Branch','City','Type','Status','Action'].map(h=><th className="p-3" key={h}>{h}</th>)}</tr></thead><tbody>{branches.map(b=><tr key={b.id} className="border-b border-graphite-800"><td className="p-3 font-mono">{b.code}</td><td className="p-3">{b.name}</td><td className="p-3">{b.city||'—'}</td><td className="p-3">{t(moneyless(b.type))}</td><td className="p-3">{b.is_active?t('Active'):t('Inactive')}</td><td className="p-3"><button className="btn-ghost" onClick={()=>void toggleBranch(b)}>{b.is_active?t('Deactivate'):t('Reactivate')}</button></td></tr>)}</tbody></table></div></div>}
  {tab==='accounts'&&<div className="space-y-5"><form onSubmit={createAccount} className="panel p-5 space-y-4"><div><h2 className="font-semibold">{t('Add client account')}</h2><p className="text-xs text-graphite-500 mt-1">Create client records for use in orders, sales, and service workflows.</p></div><div className="grid grid-cols-1 md:grid-cols-4 gap-4"><div><label className="label">{t('Account / client name *')}</label><input className={field} value={accountName} onChange={e=>setAccountName(e.target.value)} required/></div><div><label className="label">{t('Account type')}</label><select className={field} value={accountType} onChange={e=>setAccountType(e.target.value as Account['account_type'])}>{accountTypes.map(t=><option key={t} value={t}>{t(moneyless(t))}</option>)}</select></div><div><label className="label">{t('Phone')}</label><input className={field} value={accountPhone} onChange={e=>setAccountPhone(e.target.value)}/></div><div><label className="label">{t('Website (optional)')}</label><input className={field} value={accountEmail} onChange={e=>setAccountEmail(e.target.value)} placeholder="https://…"/></div></div><div className="flex justify-end"><button className="btn-primary" disabled={saving}>{saving?'Saving…':t('Add account')}</button></div></form><div className="panel overflow-x-auto"><table className="w-full text-sm min-w-[750px]"><thead><tr className="text-left text-xs uppercase text-graphite-500 border-b border-graphite-700">{['Account','Type','Phone','Owner','Status','Action'].map(h=><th className="p-3" key={h}>{h}</th>)}</tr></thead><tbody>{accounts.map(a=><tr key={a.id} className="border-b border-graphite-800"><td className="p-3 font-medium">{a.name}</td><td className="p-3">{moneyless(a.account_type)}</td><td className="p-3">{a.phone||'—'}</td><td className="p-3">{employees.find(e=>e.id===a.owner_id)?.full_name||'—'}</td><td className="p-3">{a.is_active?t('Active'):t('Inactive')}</td><td className="p-3"><button className="btn-ghost" onClick={()=>void toggleAccount(a)}>{a.is_active?t('Deactivate'):t('Reactivate')}</button></td></tr>)}</tbody></table></div></div>}
 </div>
}