import React, { useState } from 'react';
import { 
  FileText, 
  ChevronRight, 
  ChevronDown, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  CreditCard,
  User,
  Filter,
  X,
  ArrowUpRight
} from 'lucide-react';
import { ComplaintRecord, ComplaintStatus } from '../types';

interface ComplaintsPanelProps {
  complaints: ComplaintRecord[];
  onUpdateComplaintStatus: (complaintId: string, newStatus: ComplaintStatus) => void;
  selectedComplaintId: string | null;
  onSelectComplaint: (complaint: ComplaintRecord | null) => void;
  onClose?: () => void;
}

export const ComplaintsPanel: React.FC<ComplaintsPanelProps> = ({
  complaints,
  onUpdateComplaintStatus,
  selectedComplaintId,
  onSelectComplaint,
  onClose,
}) => {
  const [filterStatus, setFilterStatus] = useState<'ALL' | ComplaintStatus>('ALL');
  const [expandedId, setExpandedId] = useState<string | null>(complaints[0]?.id || null);

  const filteredComplaints = complaints.filter((c) => {
    if (filterStatus === 'ALL') return true;
    return c.status === filterStatus;
  });

  const getStatusBadge = (status: ComplaintStatus) => {
    switch (status) {
      case 'under_investigation':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shrink-0" />
            <span>Under Investigation</span>
          </span>
        );
      case 'resolved':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-2xs">
            <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
            <span>Resolved</span>
          </span>
        );
      case 'pending_review':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-300 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
            <span>Pending Review</span>
          </span>
        );
    }
  };

  const getRiskPill = (riskLevel: string) => {
    switch (riskLevel) {
      case 'CRITICAL':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase bg-rose-100 text-rose-800 border border-rose-200">
            CRITICAL
          </span>
        );
      case 'HIGH':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase bg-amber-100 text-amber-900 border border-amber-200">
            HIGH
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase bg-blue-100 text-blue-800 border border-blue-200">
            MEDIUM
          </span>
        );
    }
  };

  return (
    <div className="h-full flex flex-col bg-white text-slate-800 select-none">
      {/* 1. Header */}
      <div className="p-4 border-b border-[#E8E4D8] flex items-center justify-between bg-white shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-teal-50 text-[#007065] flex items-center justify-center border border-[#007065]/20 shadow-2xs">
            <FileText className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                Dispute Complaints
              </h3>
              <span className="text-[11px] px-2 py-0.5 rounded-full font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
                {complaints.length}
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Formal NCRP Cybercrime dispute intake records
            </p>
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Close Panel"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* 2. Filter Status Tab Bar */}
      <div className="px-4 py-2.5 border-b border-[#E8E4D8] bg-[#FBF9F4] flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span>Filter:</span>
        </div>
        <div className="flex items-center gap-1 overflow-x-auto">
          {(['ALL', 'under_investigation', 'pending_review', 'resolved'] as const).map((st) => {
            const count = st === 'ALL' ? complaints.length : complaints.filter((c) => c.status === st).length;
            const label = st === 'ALL' ? 'All' : st === 'under_investigation' ? 'Investigating' : st === 'pending_review' ? 'Pending' : 'Resolved';
            const isActive = filterStatus === st;

            return (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap ${
                  isActive
                    ? 'bg-[#007065] text-white shadow-xs'
                    : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 hover:text-slate-900'
                }`}
              >
                <span>{label}</span>
                <span className={`text-[10px] px-1 rounded ${isActive ? 'bg-white/20 text-white' : 'text-slate-400'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Complaints Cards List */}
      <div className="p-4 space-y-3.5 flex-1 overflow-y-auto bg-[#FBF9F4]">
        {filteredComplaints.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 text-xs">
            No complaints found matching this status filter.
          </div>
        ) : (
          filteredComplaints.map((c) => {
            const isSelected = selectedComplaintId === c.id;
            const isExpanded = expandedId === c.id;

            return (
              <div
                key={c.id}
                className={`rounded-2xl border bg-white transition-all overflow-hidden ${
                  isSelected
                    ? 'border-[#007065] ring-2 ring-[#007065]/20 shadow-sm'
                    : 'border-slate-200/90 hover:border-slate-300 shadow-2xs'
                }`}
              >
                {/* Card Summary Header */}
                <div
                  onClick={() => {
                    setExpandedId(isExpanded ? null : c.id);
                    onSelectComplaint(c);
                  }}
                  className="p-4 cursor-pointer hover:bg-slate-50/50 transition-colors"
                >
                  {/* Top Row: Ref ID + Risk Pill + Status Badge */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        {c.complaintRef}
                      </span>
                      {getRiskPill(c.riskLevel)}
                    </div>
                    {getStatusBadge(c.status)}
                  </div>

                  {/* Complaint Description - Clear, readable text */}
                  <p className="text-xs text-slate-800 leading-relaxed font-normal my-2">
                    {c.shortDescription}
                  </p>

                  {/* Meta Strip: Amount & Details Toggle */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs mt-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">Dispute:</span>
                      <span className="font-mono font-bold text-slate-900 text-sm">
                        ₹{c.disputeAmount.toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-xs font-bold text-[#007065] hover:text-[#005a52]">
                      <span>{isExpanded ? 'Less details' : 'View details'}</span>
                      {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    </div>
                  </div>
                </div>

                {/* Expanded Card Details */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-3 border-t border-slate-100 bg-slate-50/70 space-y-3.5 animate-in fade-in duration-150">
                    {/* Originator & Beneficiary VPA Info Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {/* Originator / Victim VPA */}
                      <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs">
                        <div className="flex items-center gap-1.5 text-slate-500 mb-1">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span className="text-[10px] font-bold uppercase tracking-wider">
                            Originator / Victim VPA
                          </span>
                        </div>
                        <span className="font-mono text-xs font-bold text-slate-900 select-all block truncate">
                          {c.relatedAccountUpi}
                        </span>
                      </div>

                      {/* Beneficiary VPA */}
                      <div className="p-3 rounded-xl bg-rose-50/60 border border-rose-200/80 shadow-2xs">
                        <div className="flex items-center gap-1.5 text-rose-700 mb-1">
                          <CreditCard className="w-3.5 h-3.5 text-rose-500" />
                          <span className="text-[10px] font-bold uppercase tracking-wider">
                            Beneficiary / Mule VPA
                          </span>
                        </div>
                        <span className="font-mono text-xs font-bold text-rose-900 select-all block truncate">
                          {c.relatedBeneficiaryUpi || 'Unassigned'}
                        </span>
                      </div>
                    </div>

                    {/* UTR Reference & Category */}
                    <div className="p-2.5 rounded-xl bg-white border border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">UTR:</span>
                        <code className="font-mono font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">
                          {c.relatedTxnUtr || 'N/A'}
                        </code>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Category:</span>
                        <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                          {c.category}
                        </span>
                      </div>
                    </div>

                    {/* Analyst Note */}
                    {c.analystNotes && (
                      <div className="p-3 rounded-xl bg-amber-50 border border-amber-200/90 text-xs text-amber-950 space-y-1 shadow-2xs">
                        <div className="flex items-center gap-1.5 font-bold text-amber-900 text-xs">
                          <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span>Analyst Assessment Note:</span>
                        </div>
                        <p className="text-amber-900 leading-relaxed font-medium pl-5 text-[11px]">
                          {c.analystNotes}
                        </p>
                      </div>
                    )}

                    {/* Interactive Investigation Status Switcher */}
                    <div className="pt-2 border-t border-slate-200">
                      <span className="text-[11px] font-bold text-slate-600 block mb-2">
                        Update Case Status:
                      </span>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onUpdateComplaintStatus(c.id, 'under_investigation');
                          }}
                          className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer border flex items-center justify-center gap-1 ${
                            c.status === 'under_investigation'
                              ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200'
                          }`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" />
                          <span>Investigating</span>
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onUpdateComplaintStatus(c.id, 'pending_review');
                          }}
                          className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer border flex items-center justify-center gap-1 ${
                            c.status === 'pending_review'
                              ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-amber-50 hover:text-amber-800 hover:border-amber-200'
                          }`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" />
                          <span>Pending</span>
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onUpdateComplaintStatus(c.id, 'resolved');
                          }}
                          className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer border flex items-center justify-center gap-1 ${
                            c.status === 'resolved'
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-200'
                          }`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                          <span>Resolved</span>
                        </button>
                      </div>
                    </div>

                    {/* Highlight in Network Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectComplaint(c);
                      }}
                      className="w-full py-2 px-3 rounded-xl bg-white hover:bg-teal-50 border border-slate-200 hover:border-[#007065]/40 text-[#007065] text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <span>Highlight Entity in Network Graph</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
