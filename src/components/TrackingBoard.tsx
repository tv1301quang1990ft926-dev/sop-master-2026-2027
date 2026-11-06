import React, { useState } from 'react';
import { 
  RefreshCw, TrendingUp, AlertTriangle, ShieldAlert, 
  DollarSign, Search, Clock, Activity, X, Zap, Star 
} from 'lucide-react';

// =============================================================================
// KIỂU DỮ LIỆU TỰ ĐỊNH NGHĨA (ĐỘC LẬP 100% - KHÔNG CẦN IMPORT TỪ FILE KHÁC)
// =============================================================================
export interface TrackingMatchItem {
  match_id: string;
  giai_dau?: string;
  league_name?: string;
  tran_dau?: string;
  home_team?: string;
  away_team?: string;
  home_logo?: string;
  away_logo?: string;
  kickoff_time?: string;
  gio_thi_dau_gmt7?: string;
  match_date?: string;
  
  // Tỷ lệ 1X2 Châu Âu (GĐ1)
  odds_home_1x2?: number;
  odds_draw_1x2?: number;
  odds_away_1x2?: number;

  // Tỷ lệ Mở cửa Baseline (GĐ1)
  handicap_opening?: number;
  odds_home_opening?: number;
  odds_away_opening?: number;
  overunder_opening?: number;
  odds_over_opening?: number;
  odds_under_opening?: number;

  // Biến động Live T-3h (GĐ2)
  handicap_current_t3h?: number;
  odds_home_t3h?: number;
  odds_away_t3h?: number;
  overunder_current_t3h?: number;
  odds_over_t3h?: number;
  odds_under_t3h?: number;

  // Tín hiệu GĐ2
  expected_edge_t3h?: number;
  market_volume_trend?: string;
  smart_money_signal?: string;
  trap_odds_warning?: string;
  update_timestamp_t3h?: string;
}

interface TrackingBoardProps {
  matches?: TrackingMatchItem[];
  status?: 'loading' | 'ready' | 'error';
  onRefresh?: () => void;
}

// =============================================================================
// CÁC HÀM XỬ LÝ ĐỊNH DẠNG ODDS VÀ KÈO CHẤP (+/-) CHUẨN XÁC
// =============================================================================
function formatOdds(val?: number | null): string {
  if (val === null || val === undefined || isNaN(val)) return '--';
  return val.toFixed(2);
}

function formatHandicap(val?: number | null, isAway: boolean = false): string {
  if (val === null || val === undefined || isNaN(val)) return '--';
  const finalVal = isAway ? -val : val;
  return finalVal > 0 ? `+${finalVal.toFixed(2)}` : finalVal.toFixed(2);
}

// =============================================================================
// SUB-COMPONENT: THẺ TRẬN ĐẤU GĐ2 (MATCH CARD STAGE 2)
// =============================================================================
function MatchCardStage2Item({ match }: { match: TrackingMatchItem }) {
  const [activeModal, setActiveModal] = useState<'TRAP_ODDS' | 'ODDS_MOVEMENT' | 'SMART_MONEY' | null>(null);
  const [isTracked, setIsTracked] = useState(false);

  const league = match.giai_dau || match.league_name || 'BÓNG ĐÁ TOP 8';
  const homeName = match.home_team || match.tran_dau?.split(' vs ')[0] || 'Đội nhà';
  const awayName = match.away_team || match.tran_dau?.split(' vs ')[1] || 'Đội khách';
  const kickoff = match.kickoff_time || match.gio_thi_dau_gmt7 || 'T-3h Live';

  const isTrap = match.trap_odds_warning?.toUpperCase().includes('BẪY') || match.trap_odds_warning?.toUpperCase().includes('BAY');
  const hasSmartMoney = Boolean(match.smart_money_signal && match.smart_money_signal !== 'NEUTRAL' && match.smart_money_signal !== 'Không');
  const edgeVal = match.expected_edge_t3h || 0.0;

  const currentHcap = match.handicap_current_t3h ?? match.handicap_opening ?? 0;
  const currentOU = match.overunder_current_t3h ?? match.overunder_opening ?? 2.5;

  return (
    <div className={`overflow-hidden rounded-2xl border ${
      isTrap ? 'border-rose-500/80 bg-[#1b202c] shadow-[0_0_15px_rgba(244,63,94,0.25)]' : 'border-slate-700 bg-[#1b202c]'
    } text-white shadow-lg p-3 sm:p-4 mb-4 relative font-sans`}>
      
      {/* HEADER THẺ TRẬN ĐẤU */}
      <div className="flex items-center justify-between border-b border-slate-700/80 pb-2.5 mb-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-[10px] bg-cyan-500/20 text-cyan-400 font-bold px-1.5 py-0.5 rounded border border-cyan-500/40 shrink-0">
            GĐ2: T-3H LIVE
          </span>
          <span className="font-bold text-slate-200 uppercase tracking-wider text-xs sm:text-sm truncate max-w-[180px] sm:max-w-none">
            {league}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 font-mono text-cyan-400 font-bold text-xs">
            <Clock className="h-3.5 w-3.5 text-slate-400" />
            <span>{kickoff}</span>
          </div>
          <button 
            onClick={() => setIsTracked(!isTracked)}
            className="p-1 text-slate-400 hover:text-amber-400 transition cursor-pointer"
          >
            <Star className={`h-4 w-4 ${isTracked ? 'text-amber-400 fill-amber-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* KHUNG GRID 4 CỘT CHUẨN GĐ1 */}
      <div className="grid grid-cols-[minmax(110px,1.2fr)_repeat(3,minmax(70px,1fr))] gap-1.5 sm:gap-2 items-center text-center text-xs">
        {/* Tên Cột */}
        <div className="text-left font-bold text-slate-400 text-[11px]">Đội bóng</div>
        <div className="font-medium text-slate-300 text-[11px]">1X2 (Châu Âu)</div>
        <div className="font-medium text-slate-300 text-[11px]">Cược Chấp</div>
        <div className="font-medium text-slate-300 text-[11px]">Tài / Xỉu</div>

        {/* HÀNG 1: ĐỘI NHÀ */}
        <div className="flex items-center gap-2 text-left py-1 min-w-0">
          {match.home_logo ? (
            <img src={match.home_logo} alt="" className="h-6 w-6 object-contain shrink-0" />
          ) : (
            <div className="h-6 w-6 rounded-full bg-slate-700 shrink-0 flex items-center justify-center font-bold text-[10px] text-slate-300">H</div>
          )}
          <span className="font-bold text-xs sm:text-sm text-white truncate">{homeName}</span>
        </div>
        {/* 1X2 Home */}
        <div className="rounded-xl border border-slate-700 bg-slate-900/80 p-1.5 sm:p-2">
          <span className="text-[10px] text-slate-400 block">Chủ nhà</span>
          <span className="font-bold text-xs sm:text-sm text-white">{formatOdds(match.odds_home_1x2 || 1.85)}</span>
        </div>
        {/* Handicap Home */}
        <div className="rounded-xl border border-slate-700 bg-slate-900/80 p-1.5 sm:p-2">
          <span className="text-[10px] text-slate-400 block">{formatHandicap(currentHcap, false)}</span>
          <span className="font-bold text-xs sm:text-sm text-white">{formatOdds(match.odds_home_t3h || match.odds_home_opening || 0.92)}</span>
        </div>
        {/* Over/Under Over */}
        <div className="rounded-xl border border-slate-700 bg-slate-900/80 p-1.5 sm:p-2">
          <span className="text-[10px] text-slate-400 block">o {currentOU}</span>
          <span className="font-bold text-xs sm:text-sm text-white">{formatOdds(match.odds_over_t3h || match.odds_over_opening || 0.88)}</span>
        </div>

        {/* HÀNG 2: ĐỘI KHÁCH */}
        <div className="flex items-center gap-2 text-left py-1 min-w-0">
          {match.away_logo ? (
            <img src={match.away_logo} alt="" className="h-6 w-6 object-contain shrink-0" />
          ) : (
            <div className="h-6 w-6 rounded-full bg-slate-700 shrink-0 flex items-center justify-center font-bold text-[10px] text-slate-300">A</div>
          )}
          <span className="font-bold text-xs sm:text-sm text-white truncate">{awayName}</span>
        </div>
        {/* 1X2 Away */}
        <div className="rounded-xl border border-slate-700 bg-slate-900/80 p-1.5 sm:p-2">
          <span className="text-[10px] text-slate-400 block">Đội khách</span>
          <span className="font-bold text-xs sm:text-sm text-white">{formatOdds(match.odds_away_1x2 || 4.20)}</span>
        </div>
        {/* Handicap Away (ĐẢO DẤU CHUẨN) */}
        <div className="rounded-xl border border-slate-700 bg-slate-900/80 p-1.5 sm:p-2">
          <span className="text-[10px] text-slate-400 block">{formatHandicap(currentHcap, true)}</span>
          <span className="font-bold text-xs sm:text-sm text-white">{formatOdds(match.odds_away_t3h || match.odds_away_opening || 0.90)}</span>
        </div>
        {/* Over/Under Under */}
        <div className="rounded-xl border border-slate-700 bg-slate-900/80 p-1.5 sm:p-2">
          <span className="text-[10px] text-slate-400 block">u {currentOU}</span>
          <span className="font-bold text-xs sm:text-sm text-white">{formatOdds(match.odds_under_t3h || match.odds_under_opening || 0.95)}</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* BỘ 3 NÚT BẤM GĐ2 XẾP NẰM TRÊN 1 HÀNG NGANG CHUẨN (GRID 3 CỘT) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-3 gap-2 mt-3 pt-2.5 border-t border-slate-700/80">
        <button
          onClick={() => setActiveModal('TRAP_ODDS')}
          className={`flex items-center justify-center gap-1 py-2 px-1 rounded-xl border text-center transition cursor-pointer ${
            isTrap ? 'bg-rose-950/80 border-rose-500/80 text-rose-300' : 'bg-slate-800/90 border-slate-700 text-amber-400 hover:bg-slate-700'
          }`}
        >
          <AlertTriangle className={`h-3.5 w-3.5 ${isTrap ? 'animate-bounce text-rose-400' : 'text-amber-400'}`} />
          <span className="text-xs font-bold">{isTrap ? 'Bẫy Odds!' : 'Kiểm Bẫy Odds'}</span>
        </button>

        <button
          onClick={() => setActiveModal('ODDS_MOVEMENT')}
          className="flex items-center justify-center gap-1 py-2 px-1 rounded-xl border border-cyan-500/40 bg-slate-800/90 hover:bg-cyan-950/60 text-cyan-300 transition cursor-pointer"
        >
          <Activity className="h-3.5 w-3.5 text-cyan-400" />
          <span className="text-xs font-bold">Biến Động Odds</span>
        </button>

        <button
          onClick={() => setActiveModal('SMART_MONEY')}
          className={`flex items-center justify-center gap-1 py-2 px-1 rounded-xl border text-center transition cursor-pointer ${
            hasSmartMoney ? 'bg-emerald-950/80 border-emerald-500/80 text-emerald-300' : 'bg-slate-800/90 border-slate-700 text-emerald-400 hover:bg-slate-700'
          }`}
        >
          <DollarSign className="h-3.5 w-3.5 text-emerald-400" />
          <span className="text-xs font-bold">Dòng Tiền & EV</span>
        </button>
      </div>

      {/* POPUP MODAL CHUẨN BẢO MẬT IP MOAT */}
      {activeModal && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setActiveModal(null)}
        >
          <div 
            className="bg-[#1b202c] border border-slate-600 rounded-2xl w-full max-w-sm p-5 text-white shadow-2xl relative space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <button onClick={() => setActiveModal(null)} className="absolute top-3 right-3 text-slate-400 hover:text-white p-1">
              <X className="h-5 w-5" />
            </button>

            <div className="text-center font-bold text-xs text-slate-400 bg-slate-900 py-1.5 rounded-lg border border-slate-800">
              {homeName} vs {awayName}
            </div>

            {/* MODAL 1: BẪY ODDS */}
            {activeModal === 'TRAP_ODDS' && (
              <div className="space-y-2.5">
                <h3 className="font-bold text-sm text-rose-400 flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4" /> Kiểm Duyệt Bẫy Odds (Rule 5)
                </h3>

                <div className={`p-3.5 rounded-xl border ${isTrap ? 'bg-rose-950/90 border-rose-500 text-rose-200' : 'bg-slate-900 border-slate-700 text-emerald-300'}`}>
                  <p className="font-bold text-xs mb-1">{isTrap ? '⚠️ CẢNH BÁO BẪY ODDS NHÀ CÁI' : 'AN TOÀN: KHÔNG CÓ BẪY'}</p>
                  <p className="text-xs leading-relaxed text-slate-300">
                    {isTrap 
                      ? 'Nhà cái có dấu hiệu đè giá bất thường — Khuyên không nên cược cửa Trên (Kích hoạt Rule 5 Quarantine).'
                      : 'Tỷ lệ biến động kèo tự nhiên theo khối lượng giao dịch thị trường.'}
                  </p>
                </div>
              </div>
            )}

            {/* MODAL 2: BIẾN ĐỘNG ODDS */}
            {activeModal === 'ODDS_MOVEMENT' && (
              <div className="space-y-2.5">
                <h3 className="font-bold text-sm text-cyan-400 flex items-center gap-2">
                  <Activity className="h-4 w-4" /> So Sánh Biến Động Odds (T-3h vs T-24h)
                </h3>
                <div className="bg-slate-900 border border-slate-700 p-3 rounded-xl space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Kèo Chấp Mở Cửa (T-24h):</span>
                    <span className="font-bold text-white">{formatHandicap(match.handicap_opening, false)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Kèo Chấp Hiện Tại (T-3h):</span>
                    <span className="font-bold text-cyan-400">{formatHandicap(currentHcap, false)}</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-slate-800">
                    <span className="text-slate-400">Tài Xỉu Mở Cửa (T-24h):</span>
                    <span className="font-bold text-white">{match.overunder_opening ?? 2.5}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Tài Xỉu Hiện Tại (T-3h):</span>
                    <span className="font-bold text-cyan-400">{currentOU}</span>
                  </div>
                </div>
              </div>
            )}

            {/* MODAL 3: DÒNG TIỀN & EV */}
            {activeModal === 'SMART_MONEY' && (
              <div className="space-y-2.5">
                <h3 className="font-bold text-sm text-emerald-400 flex items-center gap-2">
                  <Zap className="h-4 w-4" /> Dòng Tiền Smart Money & EV Edge
                </h3>
                <div className="bg-slate-900 border border-emerald-800/60 p-3.5 rounded-xl space-y-2 text-xs">
                  <p className="text-emerald-300 font-bold">{match.smart_money_signal || 'Dòng tiền tự nhiên giữa 2 cửa.'}</p>
                  <div className="flex justify-between items-center pt-2 border-t border-slate-800">
                    <span className="text-slate-400">Lợi Thế Kỳ Vọng:</span>
                    <span className="text-base font-black text-emerald-400 font-mono">+{edgeVal}% EV</span>
                  </div>
                </div>
              </div>
            )}

            <button onClick={() => setActiveModal(null)} className="w-full mt-3 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold text-slate-200 cursor-pointer">
              Đóng Lại
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// COMPONENT CHÍNH: TRACKING BOARD GIAI ĐOẠN 2
// =============================================================================
export default function TrackingBoard({
  matches = [],
  status = 'ready',
  onRefresh
}: TrackingBoardProps) {
  const [filterType, setFilterType] = useState<'ALL' | 'TRAP' | 'SMART_MONEY' | 'HIGH_EDGE'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    if (onRefresh) onRefresh();
    setTimeout(() => setIsRefreshing(false), 800);
  };

  const filteredMatches = matches.filter(item => {
    const isTrap = item.trap_odds_warning?.toUpperCase().includes('BẪY') || item.trap_odds_warning?.toUpperCase().includes('BAY');
    const isSmart = Boolean(item.smart_money_signal && item.smart_money_signal !== 'Không' && item.smart_money_signal !== 'NEUTRAL');
    const isHighEdge = (item.expected_edge_t3h || 0) >= 7.0;

    const leagueName = item.giai_dau || item.league_name || '';
    const matchName = item.tran_dau || `${item.home_team} vs ${item.away_team}`;
    const matchesSearch = leagueName.toLowerCase().includes(searchQuery.toLowerCase()) || matchName.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (filterType === 'TRAP') return isTrap;
    if (filterType === 'SMART_MONEY') return isSmart;
    if (filterType === 'HIGH_EDGE') return isHighEdge;
    return true;
  });

  return (
    <div className="space-y-4 font-sans text-slate-100">
      {/* HEADER BAR GĐ2 */}
      <div className="rounded-2xl border border-cyan-500/30 bg-[#1b202c] p-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-700/80 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-cyan-400 animate-ping" />
              <h1 className="text-base font-bold text-cyan-300 uppercase tracking-wide">
                GĐ2 — Tracking Movement (Mốc T-3h)
              </h1>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Phân tích biến động Odds Live sát giờ G & Phát hiện bẫy nhà cái
            </p>
          </div>

          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center justify-center gap-2 rounded-xl bg-cyan-500/10 border border-cyan-500/40 px-3.5 py-2 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/20 active:scale-95 transition cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Làm Mới Live Odds</span>
          </button>
        </div>

        {/* BỘ LỌC TÍN HIỆU RAPID FILTERS */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 pt-1">
          <div className="flex flex-wrap gap-1.5 text-xs">
            <button
              onClick={() => setFilterType('ALL')}
              className={`rounded-lg px-3 py-1.5 font-medium transition cursor-pointer ${
                filterType === 'ALL'
                  ? 'bg-cyan-500 text-slate-950 font-bold'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Tất Cả ({matches.length})
            </button>
            <button
              onClick={() => setFilterType('TRAP')}
              className={`flex items-center gap-1 rounded-lg px-3 py-1.5 font-medium transition cursor-pointer ${
                filterType === 'TRAP'
                  ? 'bg-rose-500 text-slate-950 font-bold'
                  : 'bg-slate-800 text-rose-400 hover:bg-slate-700'
              }`}
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>Bẫy Odds</span>
            </button>
            <button
              onClick={() => setFilterType('SMART_MONEY')}
              className={`flex items-center gap-1 rounded-lg px-3 py-1.5 font-medium transition cursor-pointer ${
                filterType === 'SMART_MONEY'
                  ? 'bg-emerald-500 text-slate-950 font-bold'
                  : 'bg-slate-800 text-emerald-400 hover:bg-slate-700'
              }`}
            >
              <DollarSign className="h-3.5 w-3.5" />
              <span>Dòng Tiền</span>
            </button>
            <button
              onClick={() => setFilterType('HIGH_EDGE')}
              className={`flex items-center gap-1 rounded-lg px-3 py-1.5 font-medium transition cursor-pointer ${
                filterType === 'HIGH_EDGE'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'bg-slate-800 text-amber-300 hover:bg-slate-700'
              }`}
            >
              <TrendingUp className="h-3.5 w-3.5" />
              <span>Edge High (+EV)</span>
            </button>
          </div>

          {/* Ô TÌM KIẾM */}
          <div className="relative w-full sm:w-48">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm giải hoặc đội..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* DANH SÁCH THẺ TRẬN ĐẤU */}
      {filteredMatches.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-700 bg-[#1b202c] p-8 text-center text-xs text-slate-400">
          Chưa có trận đấu nào trong danh sách hoặc không tìm thấy trận khớp bộ lọc.
        </div>
      ) : (
        <div>
          {filteredMatches.map((item) => (
            <MatchCardStage2Item key={item.match_id} match={item} />
          ))}
        </div>
      )}
    </div>
  );
}