import { useState } from 'react'
import { Eye, Save } from 'lucide-react'

const FIELD = ({ label, children }) => (
  <div>
    <label className="label">{label}</label>
    {children}
  </div>
)

const NumInput = ({ value, onChange, placeholder = '0.00' }) => (
  <input
    type="number"
    step="0.25"
    className="input text-center font-mono"
    value={value}
    onChange={e => onChange(e.target.value)}
    placeholder={placeholder}
  />
)

export default function PrescriptionForm({ value, onChange, showSave = false, onSave }) {
  const f = value || {}
  const up = (k, v) => onChange({ ...f, [k]: v })

  return (
    <div className="space-y-4">
      {/* Table header */}
      <div className="bg-blue-50 rounded-xl p-3">
        <div className="grid grid-cols-4 gap-2 mb-2">
          <div/>
          {['SPH', 'CYL', 'AXIS'].map(h => (
            <div key={h} className="text-center text-xs font-bold text-blue-700 uppercase tracking-wide">{h}</div>
          ))}
        </div>

        {/* Right eye */}
        <div className="grid grid-cols-4 gap-2 mb-2 items-center">
          <div className="text-xs font-bold text-gray-600 flex items-center gap-1">
            <Eye size={12}/> OD يمين
          </div>
          <NumInput value={f.sph_od || ''} onChange={v => up('sph_od', v)}/>
          <NumInput value={f.cyl_od || ''} onChange={v => up('cyl_od', v)}/>
          <input type="number" min="0" max="180" step="1" className="input text-center font-mono"
            value={f.axis_od || ''} onChange={e => up('axis_od', e.target.value)} placeholder="0"/>
        </div>

        {/* Left eye */}
        <div className="grid grid-cols-4 gap-2 items-center">
          <div className="text-xs font-bold text-gray-600 flex items-center gap-1">
            <Eye size={12}/> OS يسار
          </div>
          <NumInput value={f.sph_os || ''} onChange={v => up('sph_os', v)}/>
          <NumInput value={f.cyl_os || ''} onChange={v => up('cyl_os', v)}/>
          <input type="number" min="0" max="180" step="1" className="input text-center font-mono"
            value={f.axis_os || ''} onChange={e => up('axis_os', e.target.value)} placeholder="0"/>
        </div>
      </div>

      {/* PD */}
      <div className="grid grid-cols-3 gap-3">
        <FIELD label="PD إجمالي">
          <NumInput value={f.pd || ''} onChange={v => up('pd', v)} placeholder="64"/>
        </FIELD>
        <FIELD label="PD يمين">
          <NumInput value={f.pd_right || ''} onChange={v => up('pd_right', v)} placeholder="32"/>
        </FIELD>
        <FIELD label="PD يسار">
          <NumInput value={f.pd_left || ''} onChange={v => up('pd_left', v)} placeholder="32"/>
        </FIELD>
      </div>

      {/* ADD */}
      <FIELD label="ADD (للبروجريسيف)">
        <NumInput value={f.add_power || ''} onChange={v => up('add_power', v)} placeholder="0.00"/>
      </FIELD>

      {/* Notes */}
      <FIELD label="ملاحظات الوصفة">
        <textarea className="input h-16 resize-none" value={f.notes || ''}
          onChange={e => up('notes', e.target.value)} placeholder="أي ملاحظات إضافية..."/>
      </FIELD>

      {showSave && onSave && (
        <button onClick={onSave} className="btn-primary w-full justify-center">
          <Save size={15}/> حفظ الوصفة
        </button>
      )}
    </div>
  )
}
