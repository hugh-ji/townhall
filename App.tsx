import React, { useState, useEffect, useMemo, useRef } from 'react';
import { UserData, MbtiGroup, MbtiSelection } from './types';
import { MBTI_QUESTIONS } from './constants';
import Badge from './components/Badge';
import { Sparkles, Printer, RefreshCcw, Lock, Download, CheckSquare, Square, Trash2, LayoutGrid, Loader2, ArrowRight, ArrowLeft, Check, AlertCircle } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

// --- Utility Functions ---

const determineGroup = (selection: MbtiSelection): MbtiGroup => {
  // Logic: NT(N+T), NF(N+F), SJ(S+J), SP(S+P)
  if (selection.ns === 'N' && selection.ft === 'T') return 'NT';
  if (selection.ns === 'N' && selection.ft === 'F') return 'NF';
  if (selection.ns === 'S' && selection.jp === 'J') return 'SJ';
  if (selection.ns === 'S' && selection.jp === 'P') return 'SP';
  
  // Default fallback for partial selection (though UI prevents this)
  if (selection.ns === 'N') return 'NT'; 
  return 'SP';
};

const formatDate = (timestamp: number) => {
  return new Date(timestamp).toLocaleString('ko-KR', {
    month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
  });
};

// --- Main Component ---

const App: React.FC = () => {
  // --- State ---
  const [view, setView] = useState<'FORM' | 'RESULT' | 'ADMIN_LOGIN' | 'ADMIN_DASHBOARD'>('FORM');
  const [currentStep, setCurrentStep] = useState(1); // 1:Name, 2-5:MBTI, 6:Interest, 7:Alcohol, 8:OfficeSupply
  const TOTAL_STEPS = 8;

  const [users, setUsers] = useState<UserData[]>([]);
  const [currentUser, setCurrentUser] = useState<UserData | null>(null);
  
  // Admin State
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isGenerating, setIsGenerating] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [interest, setInterest] = useState('');
  const [alcoholScore, setAlcoholScore] = useState<number | null>(null);
  const [officeSupply, setOfficeSupply] = useState('');
  const [mbtiSelection, setMbtiSelection] = useState<MbtiSelection>({
    ei: null, ns: null, ft: null, jp: null
  });
  
  // Ref for capture container
  const printContainerRef = useRef<HTMLDivElement>(null);

  // --- Effects ---

  // Load history on mount
  useEffect(() => {
    const saved = localStorage.getItem('vision_party_users');
    if (saved) {
      try {
        setUsers(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load history", e);
      }
    }
  }, []);

  // Save history whenever users change
  useEffect(() => {
    localStorage.setItem('vision_party_users', JSON.stringify(users));
  }, [users]);

  // --- Calculated Values ---

  const nameCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    users.forEach(u => {
      counts[u.name] = (counts[u.name] || 0) + 1;
    });
    return counts;
  }, [users]);

  // --- Handlers: Form Navigation ---

  const handleNext = () => {
    if (currentStep < TOTAL_STEPS) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleMbtiSelect = (key: keyof MbtiSelection, value: any) => {
    setMbtiSelection(prev => ({ ...prev, [key]: value }));
    // Auto advance for MBTI questions after a short delay for better UX
    setTimeout(() => {
      handleNext();
    }, 250);
  };

  const isStepValid = () => {
    switch (currentStep) {
      case 1: return name.trim().length > 0;
      case 2: return !!mbtiSelection.ei;
      case 3: return !!mbtiSelection.ns;
      case 4: return !!mbtiSelection.ft;
      case 5: return !!mbtiSelection.jp;
      case 6: return interest.trim().length > 0;
      case 7: return alcoholScore !== null;
      case 8: return true; // Optional step
      default: return false;
    }
  };

  const handleSubmit = () => {
    // officeSupply is optional, so it is removed from the validation check here
    if (name && interest && mbtiSelection.ei && mbtiSelection.ns && mbtiSelection.ft && mbtiSelection.jp && alcoholScore !== null) {
      const newUser: UserData = {
        id: Date.now().toString(),
        name: name.trim(),
        interest: interest.trim(),
        alcoholScore: alcoholScore,
        officeSupply: officeSupply.trim(),
        mbtiSelection: mbtiSelection,
        mbtiGroup: determineGroup(mbtiSelection),
        timestamp: Date.now(),
        isPrinted: false
      };

      setUsers(prev => [newUser, ...prev]);
      setCurrentUser(newUser);
      setView('RESULT');
    }
  };

  const handleReset = () => {
    setName('');
    setInterest('');
    setAlcoholScore(null);
    setOfficeSupply('');
    setMbtiSelection({ ei: null, ns: null, ft: null, jp: null });
    setCurrentStep(1);
    setView('FORM');
    setCurrentUser(null);
  };

  // --- Handlers: Admin ---

  const handleAdminLogin = () => {
    if (passwordInput === '0605') {
      setView('ADMIN_DASHBOARD');
      setPasswordInput('');
      setLoginError(false);
    } else {
      setLoginError(true);
    }
  };

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      // Removed the 4 item limit check here to allow bulk deletion.
      // The check is now in handleDownloadPdf.
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const handleDeleteSelected = () => {
    if (window.confirm(`${selectedIds.size}개의 데이터를 삭제하시겠습니까?`)) {
      setUsers(prev => prev.filter(u => !selectedIds.has(u.id)));
      setSelectedIds(new Set());
    }
  };

  const handleDownloadCsv = () => {
    const targets = selectedIds.size > 0 
      ? users.filter(u => selectedIds.has(u.id)) 
      : users;
    
    const headers = ['ID', 'Name', 'MBTI', 'Group', 'Interest', 'Alcohol(1-5)', 'Office Supply Link', 'Timestamp'];
    const csvContent = [
      headers.join(','),
      ...targets.map(u => {
        const mbti = `${u.mbtiSelection.ei}${u.mbtiSelection.ns}${u.mbtiSelection.ft}${u.mbtiSelection.jp}`;
        // Escape quotes in text fields
        const safeInterest = `"${u.interest.replace(/"/g, '""')}"`;
        const safeName = `"${u.name.replace(/"/g, '""')}"`;
        const safeSupply = `"${u.officeSupply.replace(/"/g, '""')}"`;
        return [
          u.id, safeName, mbti, u.mbtiGroup, safeInterest, u.alcoholScore, safeSupply, new Date(u.timestamp).toISOString()
        ].join(',');
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `vision_party_badges_${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
  };

  const markAsPrinted = (ids: string[]) => {
    setUsers(prev => prev.map(u => ids.includes(u.id) ? { ...u, isPrinted: true } : u));
  };

  // --- PDF Generation Logic ---

  // Determine which badges to show in the hidden capture area
  const printCandidates = useMemo(() => {
    if (view === 'RESULT' && currentUser) {
      return [currentUser];
    }
    if (view === 'ADMIN_DASHBOARD') {
      return users.filter(u => selectedIds.has(u.id));
    }
    return [];
  }, [view, currentUser, users, selectedIds]);

  const handleDownloadPdf = async () => {
    if (printCandidates.length === 0) {
      alert("인쇄할 대상을 선택해주세요.");
      return;
    }
    
    if (view === 'ADMIN_DASHBOARD' && printCandidates.length > 4) {
      alert("한 번에 최대 4개까지만 인쇄할 수 있습니다. 선택을 줄여주세요.");
      return;
    }

    setIsGenerating(true);

    try {
      // Wait for DOM update
      await new Promise(resolve => setTimeout(resolve, 500));

      const container = printContainerRef.current;
      if (!container) throw new Error("Print container not found");

      const badges = container.querySelectorAll('.badge-capture-wrapper');
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const startX = 1;
      const startY = 10;
      const colWidth = 104;
      const rowHeight = 129;

      for (let i = 0; i < badges.length; i++) {
        const badgeEl = badges[i] as HTMLElement;
        
        const canvas = await html2canvas(badgeEl, {
          scale: 2, // 2x scale for better retina/print resolution
          useCORS: true,
          backgroundColor: null,
          logging: false
        });

        const imgData = canvas.toDataURL('image/png');
        
        // Grid position
        const col = i % 2;
        const row = Math.floor(i / 2);

        const x = startX + (col * colWidth);
        const y = startY + (row * rowHeight);

        pdf.addImage(imgData, 'PNG', x, y, colWidth, rowHeight);
      }

      pdf.save(`vision_party_badges_${new Date().getTime()}.pdf`);

      // Update printed status
      const ids = printCandidates.map(u => u.id);
      markAsPrinted(ids);
      
      // Clear selection after print for better workflow
      setSelectedIds(new Set());

    } catch (error) {
      console.error("PDF Generation failed:", error);
      alert("PDF 생성 중 오류가 발생했습니다.");
    } finally {
      setIsGenerating(false);
    }
  };

  // --- Render Steps ---

  const renderStepContent = () => {
    switch (currentStep) {
      case 1: // Name
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-gray-900">이름을 알려주세요</h2>
              <p className="text-gray-500">명찰에 인쇄될 이름을 영어 대문자로 입력해주세요. (확장자(성) 제외 이름만 입력)</p>
            </div>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && name.trim() && handleNext()}
              placeholder="예: CHLOE, HUGH"
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-6 py-5 text-2xl text-center font-bold tracking-wider placeholder:font-normal placeholder:text-gray-400 focus:ring-2 focus:ring-[#D9FF08] focus:border-black outline-none transition uppercase text-black"
              autoFocus
            />
          </div>
        );

      case 2: // MBTI E/I
      case 3: // MBTI N/S
      case 4: // MBTI T/F
      case 5: // MBTI J/P
        const questionIndex = currentStep - 2;
        const q = MBTI_QUESTIONS[questionIndex];
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="text-center space-y-2">
              <span className="text-black font-extrabold tracking-widest text-xs uppercase bg-[#D9FF08] px-2 py-0.5 rounded-sm">Question {questionIndex + 1}/4</span>
              <h2 className="text-2xl font-bold text-gray-900">{q.title}</h2>
            </div>
            <div className="grid grid-cols-1 gap-4">
              {q.options.map((opt) => {
                const isSelected = mbtiSelection[q.key as keyof MbtiSelection] === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => handleMbtiSelect(q.key as keyof MbtiSelection, opt.value)}
                    className={`relative p-6 rounded-xl border text-left transition-all duration-200 group hover:scale-[1.01]
                      ${isSelected 
                        ? 'bg-[#D9FF08] border-black shadow-lg' 
                        : 'bg-white border-gray-200 hover:border-black hover:shadow-md'
                      }`}
                  >
                    <div className="font-bold text-lg mb-2 flex items-center justify-between">
                      <span className={isSelected ? 'text-black' : 'text-gray-900'}>{opt.label}</span>
                      {isSelected && <div className="w-3 h-3 rounded-full bg-black" />}
                    </div>
                    <div className={`text-sm leading-relaxed ${isSelected ? 'text-black/80' : 'text-gray-500'}`}>{opt.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>
        );

      case 6: // Interest
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
             <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-gray-900">2026년 나의 최대 관심사는?</h2>
              <p className="text-gray-500">명찰에 들어갈 키워드를 10자 이내로 적어주세요.</p>
            </div>
            <div className="relative">
              <input 
                type="text" 
                value={interest}
                onChange={(e) => setInterest(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && interest.trim() && handleNext()}
                placeholder="예: 생성형 AI, 재테크, 건강, 여행..."
                maxLength={10}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-6 py-5 text-xl text-center font-bold focus:ring-2 focus:ring-[#D9FF08] focus:border-black outline-none transition text-black placeholder:text-gray-400"
                autoFocus
              />
              <div className="absolute right-4 bottom-4 text-xs text-gray-400">{interest.length}/10</div>
            </div>
          </div>
        );

      case 7: // Alcohol
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
             <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-gray-900">회식 자리, 당신의 스타일은?</h2>
              <p className="text-gray-500">솔직하게 골라주세요! (1~5단계)</p>
            </div>
            
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((level) => {
                const isSelected = alcoholScore === level;
                let label = `${level}단계`;
                let desc = "";
                
                if (level === 1) {
                  label = "1점 (안전귀가형)";
                  desc = "술은 전혀 안 마셔요. 맛있는 음식과 탄산음료, 차분한 대화를 선호합니다.";
                } else if (level === 2) {
                  label = "2점 (기분내기형)";
                  desc = "맥주 한두 잔 정도는 가볍게 즐겨요. 술보다는 적당한 소통이 목적입니다.";
                } else if (level === 3) {
                  label = "3점 (중도통합형)";
                  desc = "분위기에 맞춰 적당히 마십니다. 주는 술 마다하지 않고 대화도 즐겁게 참여해요.";
                } else if (level === 4) {
                  label = "4점 (회식열정형)";
                  desc = "술 마시는 분위기를 좋아합니다! 동료들과 술잔을 기울이며 텐션 높게 노는 게 즐거워요.";
                } else if (level === 5) {
                  label = "5점 (폭주기관차형)";
                  desc = "안주보다는 술! 끝까지 달릴 준비가 되어 있습니다. 주종 불문 환영입니다.";
                }

                return (
                  <button
                    key={level}
                    onClick={() => setAlcoholScore(level)}
                    className={`w-full p-4 rounded-xl border text-left transition-all duration-200 flex items-center gap-4 group
                      ${isSelected 
                        ? 'bg-[#D9FF08] border-black shadow-md' 
                        : 'bg-white border-gray-200 hover:border-black hover:bg-gray-50'
                      }`}
                  >
                    <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold shrink-0 transition-colors border
                      ${isSelected ? 'bg-black text-[#D9FF08] border-black' : 'bg-gray-100 text-gray-400 border-gray-200 group-hover:border-gray-400'}`}>
                      {level}
                    </div>
                    <div className="flex-1">
                      <div className={`font-bold ${isSelected ? 'text-black' : 'text-gray-900'}`}>
                        {label}
                      </div>
                      <div className={`text-xs mt-0.5 ${isSelected ? 'text-black/80' : 'text-gray-500'}`}>
                        {desc}
                      </div>
                    </div>
                    {isSelected && <Check className="text-black" size={20} />}
                  </button>
                )
              })}
            </div>
          </div>
        );
      
      case 8: // Office Supply (New)
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
             <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-gray-900 break-keep">볼팬 업무력 향상을 위해 꼭 필요한 사무용품을 추천한다면?</h2>
              <div className="space-y-1">
                <p className="text-gray-500">3만원 이내 제품의 <span className="font-bold text-black">구매 링크(URL)</span>를 입력해주세요.</p>
                <p className="text-red-500 text-sm font-bold">⚠️ 미입력 시 경품 추첨 대상에서 제외됩니다.</p>
              </div>
            </div>
            <div className="relative">
              <input 
                type="text" 
                value={officeSupply}
                onChange={(e) => setOfficeSupply(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleNext()}
                placeholder="예: https://www.coupang.com/vp/products/..."
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-6 py-5 text-lg text-center font-bold focus:ring-2 focus:ring-[#D9FF08] focus:border-black outline-none transition text-black placeholder:text-gray-400"
                autoFocus
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // --- Views ---

  const renderWizard = () => (
    <div className="max-w-md mx-auto w-full flex flex-col h-[80vh] justify-center">
      {/* Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full h-1.5 mb-8 overflow-hidden">
        <div 
          className="bg-[#D9FF08] h-full transition-all duration-500 ease-out"
          style={{ width: `${(currentStep / TOTAL_STEPS) * 100}%` }}
        />
      </div>

      <div className="bg-white border border-gray-100 rounded-3xl p-6 md:p-8 shadow-2xl shadow-gray-200/50 relative min-h-[400px] flex flex-col justify-between">
        
        {/* Content Area */}
        <div className="flex-1 flex flex-col justify-center">
           {renderStepContent()}
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-100">
          <button 
            onClick={handleBack}
            className={`flex items-center gap-2 text-gray-400 hover:text-black transition px-2 py-2 rounded-lg hover:bg-gray-100
              ${currentStep === 1 ? 'invisible' : 'visible'}`}
          >
            <ArrowLeft size={20} />
            <span>이전</span>
          </button>
          
          <button 
            onClick={handleNext}
            disabled={!isStepValid()}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all
              ${isStepValid() 
                ? 'bg-black text-[#D9FF08] shadow-lg hover:bg-gray-800 hover:translate-y-[-1px]' 
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
          >
            <span>{currentStep === TOTAL_STEPS ? '완료' : '다음'}</span>
            {currentStep !== TOTAL_STEPS && <ArrowRight size={20} />}
            {currentStep === TOTAL_STEPS && <Check size={20} />}
          </button>
        </div>
      </div>
      
      {/* Admin Link */}
      <div className="mt-8 flex justify-center opacity-30 hover:opacity-100 transition">
        <button onClick={() => setView('ADMIN_LOGIN')} className="text-gray-400 text-xs flex items-center gap-1 hover:text-black">
          <Lock size={10} /> 관리자 페이지
        </button>
      </div>
    </div>
  );

  const renderAdminLogin = () => (
    <div className="max-w-md mx-auto w-full pt-20">
      <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-2xl text-center">
        <div className="inline-flex justify-center items-center w-16 h-16 rounded-full bg-gray-100 mb-6">
          <Lock className="text-gray-400" size={32} />
        </div>
        <h2 className="text-2xl font-bold mb-2 text-gray-900">관리자 로그인</h2>
        <p className="text-gray-500 mb-6 text-sm">접속 코드를 입력해주세요.</p>
        
        <input 
          type="password" 
          value={passwordInput}
          onChange={(e) => setPasswordInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdminLogin()}
          placeholder="Access Code"
          className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-center text-lg mb-4 focus:ring-2 focus:ring-[#D9FF08] focus:border-black outline-none text-black"
          autoFocus
        />
        
        {loginError && <p className="text-red-500 text-sm mb-4">코드가 올바르지 않습니다.</p>}
        
        <div className="flex gap-2">
           <button 
             onClick={() => setView('FORM')}
             className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-semibold transition"
           >
             취소
           </button>
           <button 
             onClick={handleAdminLogin}
             className="flex-1 py-3 bg-black hover:bg-gray-800 text-[#D9FF08] rounded-lg font-semibold transition"
           >
             확인
           </button>
        </div>
      </div>
    </div>
  );

  const renderAdminDashboard = () => (
    <div className="w-full max-w-6xl mx-auto px-4 py-8 h-screen flex flex-col">
      {/* Dashboard Header */}
      <div className="flex justify-between items-center mb-8 shrink-0">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3 text-gray-900">
            <LayoutGrid className="text-[#AACC00]" />
            명찰 데이터 관리
          </h1>
          <p className="text-gray-500 mt-1">총 등록 건수: {users.length}</p>
        </div>
        <button onClick={() => setView('FORM')} className="text-gray-400 hover:text-black transition text-sm underline">
          입력 화면으로 돌아가기
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 mb-4 shrink-0 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-2 mr-auto text-sm text-gray-500">
          <CheckSquare size={16} />
          <span>{selectedIds.size}개 선택됨 (인쇄 권장: 4개 이하)</span>
        </div>

        <button 
          onClick={handleDeleteSelected}
          disabled={selectedIds.size === 0 || isGenerating}
          className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 rounded-lg transition disabled:opacity-30 text-sm font-semibold"
        >
          <Trash2 size={16} /> 삭제
        </button>

        <button 
          onClick={handleDownloadCsv}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition text-sm font-semibold"
        >
          <Download size={16} /> CSV 내보내기
        </button>

        <button 
          onClick={handleDownloadPdf}
          disabled={selectedIds.size === 0 || isGenerating}
          className="flex items-center gap-2 px-6 py-2 bg-black hover:bg-gray-800 text-[#D9FF08] rounded-lg shadow-lg font-bold transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Printer size={16} />}
          {isGenerating ? '생성 중...' : `PDF 다운로드 (${selectedIds.size})`}
        </button>
      </div>

      {/* Data Table */}
      <div className="flex-1 overflow-auto bg-white border border-gray-200 rounded-xl shadow-inner relative">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider sticky top-0 z-10 shadow-sm border-b border-gray-100">
            <tr>
              <th className="p-4 w-12 text-center">선택</th>
              <th className="p-4">이름</th>
              <th className="p-4">MBTI</th>
              <th className="p-4">그룹</th>
              <th className="p-4">관심사</th>
              <th className="p-4 w-20 text-center">알코올</th>
              <th className="p-4">사무용품 링크</th>
              <th className="p-4 w-24 text-center">상태</th>
              <th className="p-4 text-right">시간</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-sm">
            {users.length === 0 ? (
              <tr>
                <td colSpan={9} className="p-10 text-center text-gray-400">데이터가 없습니다.</td>
              </tr>
            ) : (
              users.map(u => {
                const isSelected = selectedIds.has(u.id);
                const isDuplicate = nameCounts[u.name] > 1;
                
                // Determine row background color
                let rowBgClass = '';
                if (isSelected) rowBgClass = 'bg-[#D9FF08]/20';
                else if (isDuplicate) rowBgClass = 'bg-red-50';
                else rowBgClass = 'hover:bg-gray-50';

                return (
                  <tr 
                    key={u.id} 
                    className={`transition cursor-pointer ${rowBgClass}`}
                    onClick={() => toggleSelection(u.id)}
                  >
                    <td className="p-4 text-center">
                      <div className={`mx-auto flex items-center justify-center ${isSelected ? 'text-black' : 'text-gray-300'}`}>
                         {isSelected ? <CheckSquare size={20} /> : <Square size={20} />}
                      </div>
                    </td>
                    <td className={`p-4 font-bold flex items-center gap-2 ${isDuplicate ? 'text-red-600' : 'text-gray-900'}`}>
                      {u.name}
                      {isDuplicate && <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded border border-red-200">중복</span>}
                    </td>
                    <td className="p-4 font-mono text-gray-600">
                      {`${u.mbtiSelection.ei}${u.mbtiSelection.ns}${u.mbtiSelection.ft}${u.mbtiSelection.jp}`}
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-xs font-bold bg-gray-100 text-gray-600`}>
                        {u.mbtiGroup}
                      </span>
                    </td>
                    <td className="p-4 text-gray-600 max-w-xs truncate" title={u.interest}>{u.interest}</td>
                    <td className="p-4 text-center text-gray-900 font-bold">{u.alcoholScore}</td>
                    <td className="p-4 text-gray-600 max-w-xs truncate" title={u.officeSupply}>
                      {u.officeSupply ? (
                        <a href={u.officeSupply} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline" onClick={e => e.stopPropagation()}>
                          링크 확인
                        </a>
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      {u.isPrinted ? (
                        <span className="text-green-600 text-xs border border-green-200 bg-green-50 px-2 py-0.5 rounded">완료됨</span>
                      ) : (
                        <span className="text-gray-500 text-xs border border-gray-200 px-2 py-0.5 rounded">신규</span>
                      )}
                    </td>
                    <td className="p-4 text-right text-gray-400 font-mono text-xs">{formatDate(u.timestamp)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderResult = () => (
    <div className="flex flex-col items-center py-10 w-full">
      {/* Navigation / Actions */}
      <div className="w-full max-w-4xl px-4 flex justify-between items-center mb-8 no-print">
        <button 
          onClick={handleReset}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg text-gray-600 transition shadow-sm"
        >
          <RefreshCcw size={18} />
          새로 만들기
        </button>
        <div className="flex gap-3">
           <button 
            onClick={handleDownloadPdf}
            disabled={isGenerating}
            className="flex items-center gap-2 px-6 py-2 bg-black hover:bg-gray-800 text-[#D9FF08] rounded-lg shadow-lg font-bold transition disabled:opacity-50"
          >
            {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <Printer size={18} />}
            {isGenerating ? '처리 중...' : 'PDF 다운로드'}
          </button>
        </div>
      </div>

      {/* Result Display */}
      {currentUser && (
        <div className="flex flex-col items-center gap-6 no-print">
           <h2 className="text-2xl font-bold text-gray-900 mb-2">명찰 미리보기</h2>
           <div className="p-4 border border-gray-200 rounded-xl bg-white shadow-2xl transform scale-100 md:scale-100 origin-top">
             <Badge user={currentUser} />
           </div>
           <p className="text-gray-500 text-sm max-w-md text-center">
             위 디자인을 확인해주세요. 글자가 잘리거나 이상하다면 '새로 만들기'를 눌러 수정해주세요.
           </p>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-4 md:p-0 flex flex-col items-center justify-center font-sans">
      <div className="w-full h-full flex flex-col items-center min-h-screen no-print overflow-y-auto">
        {view === 'FORM' && renderWizard()}
        {view === 'RESULT' && renderResult()}
        {view === 'ADMIN_LOGIN' && renderAdminLogin()}
        {view === 'ADMIN_DASHBOARD' && renderAdminDashboard()}
      </div>

      {/* 
        Capture Container: 
        We position this absolute and way off-screen, but NOT display:none.
        This ensures html2canvas can render it. 
      */}
      <div 
        ref={printContainerRef}
        style={{ 
          position: 'absolute', 
          top: 0, 
          left: '-10000px', 
          width: '210mm',
          pointerEvents: 'none'
        }}
      >
         {printCandidates.map(u => (
            // Flex container to ensure the badge renders at correct dimensions for capture
            <div className="badge-capture-wrapper" key={u.id} style={{ display: 'inline-block', padding: 0 }}>
              <Badge user={u} />
            </div>
         ))}
      </div>
    </div>
  );
};

export default App;