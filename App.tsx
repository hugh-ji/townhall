import React, { useState, useEffect, useMemo, useRef } from 'react';
import { UserData, MbtiGroup, MbtiSelection } from './types';
import { MBTI_QUESTIONS } from './constants';
import Badge from './components/Badge';
import { Sparkles, Printer, RefreshCcw, Lock, Download, CheckSquare, Square, Trash2, LayoutGrid, Loader2, ArrowRight, ArrowLeft, Check, AlertCircle } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

// --- Utility Functions ---

const determineGroup = (selection: MbtiSelection): MbtiGroup => {
  if (selection.ns === 'N' && selection.ft === 'T') return 'NT';
  if (selection.ns === 'N' && selection.ft === 'F') return 'NF';
  if (selection.ns === 'S' && selection.jp === 'J') return 'SJ';
  if (selection.ns === 'S' && selection.jp === 'P') return 'SP';
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
  const [currentStep, setCurrentStep] = useState(1); 
  const [isSaving, setIsSaving] = useState(false); // DB 저장 상태 추가
  const TOTAL_STEPS = 8;

  const [users, setUsers] = useState<UserData[]>([]);
  const [currentUser, setCurrentUser] = useState<UserData | null>(null);
  
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isGenerating, setIsGenerating] = useState(false);

  const [name, setName] = useState('');
  const [interest, setInterest] = useState('');
  const [alcoholScore, setAlcoholScore] = useState<number | null>(null);
  const [officeSupply, setOfficeSupply] = useState('');
  const [mbtiSelection, setMbtiSelection] = useState<MbtiSelection>({
    ei: null, ns: null, ft: null, jp: null
  });
  
  const printContainerRef = useRef<HTMLDivElement>(null);

  // --- Effects ---

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

  useEffect(() => {
    localStorage.setItem('vision_party_users', JSON.stringify(users));
  }, [users]);

  const nameCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    users.forEach(u => {
      counts[u.name] = (counts[u.name] || 0) + 1;
    });
    return counts;
  }, [users]);

  // --- Handlers: DB Storage ---

  const saveToGoogleSheet = async (userData: UserData) => {
    const GAS_URL = "https://script.google.com/macros/s/AKfycbzSVRd1Cn5Sx2UGi9Pk6BxWYLr0iKw5x2qA70MNd--w1kUJJ5Dz6GQrCzQnS3_2S-Hyhw/exec";
    
    const payload = {
      id: userData.id,
      name: userData.name,
      mbti: `${userData.mbtiSelection.ei}${userData.mbtiSelection.ns}${userData.mbtiSelection.ft}${userData.mbtiSelection.jp}`,
      interest: userData.interest,
      alcoholScore: userData.alcoholScore,
      officeSupply: userData.officeSupply,
      timestamp: new Date(userData.timestamp).toISOString()
    };

    try {
      await fetch(GAS_URL, {
        method: "POST",
        mode: "no-cors", // GAS POST를 위한 설정
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      console.log("DB 저장 시도 완료");
    } catch (error) {
      console.error("DB 저장 실패:", error);
    }
  };

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
      case 8: return true; 
      default: return false;
    }
  };

  const handleSubmit = async () => {
    if (name && interest && mbtiSelection.ei && mbtiSelection.ns && mbtiSelection.ft && mbtiSelection.jp && alcoholScore !== null) {
      setIsSaving(true);
      
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

      // 로컬 상태 업데이트
      setUsers(prev => [newUser, ...prev]);
      setCurrentUser(newUser);
      
      // 구글 시트 전송 (비동기)
      await saveToGoogleSheet(newUser);

      setIsSaving(false);
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
      await new Promise(resolve => setTimeout(resolve, 500));
      const container = printContainerRef.current;
      if (!container) throw new Error("Print container not found");
      const badges = container.querySelectorAll('.badge-capture-wrapper');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const startX = 1;
      const startY = 10;
      const colWidth = 104;
      const rowHeight = 129;

      for (let i = 0; i < badges.length; i++) {
        const badgeEl = badges[i] as HTMLElement;
        const canvas = await html2canvas(badgeEl, { scale: 2, useCORS: true, backgroundColor: null, logging: false });
        const imgData = canvas.toDataURL('image/png');
        const col = i % 2;
        const row = Math.floor(i / 2);
        const x = startX + (col * colWidth);
        const y = startY + (row * rowHeight);
        pdf.addImage(imgData, 'PNG', x, y, colWidth, rowHeight);
      }
      pdf.save(`vision_party_badges_${new Date().getTime()}.pdf`);
      const ids = printCandidates.map(u => u.id);
      markAsPrinted(ids);
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
      case 1:
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-gray-900">이름을 알려주세요</h2>
              <p className="text-gray-500">명찰에 인쇄될 이름을 영어 대문자로 입력해주세요. (성 제외 이름만)</p>
            </div>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && name.trim() && handleNext()}
              placeholder="예: CHLOE, HUGH"
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-6 py-5 text-2xl text-center font-bold tracking-wider focus:ring-2 focus:ring-[#D9FF08] focus:border-black outline-none transition uppercase text-black"
              autoFocus
            />
          </div>
        );

      case 2: case 3: case 4: case 5:
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
                    className={`relative p-6 rounded-xl border text-left transition-all duration-200 group hover:scale-[1.01] ${isSelected ? 'bg-[#D9FF08] border-black shadow-lg' : 'bg-white border-gray-200 hover:border-black hover:shadow-md'}`}
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

      case 6:
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
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-6 py-5 text-xl text-center font-bold focus:ring-2 focus:ring-[#D9FF08] focus:border-black outline-none transition text-black"
                autoFocus
              />
              <div className="absolute right-4 bottom-4 text-xs text-gray-400">{interest.length}/10</div>
            </div>
          </div>
        );

      case 7:
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
             <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-gray-900">회식 자리, 당신의 스타일은?</h2>
              <p className="text-gray-500">솔직하게 골라주세요! (1~5단계)</p>
            </div>
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((level) => {
                const isSelected = alcoholScore === level;
                return (
                  <button
                    key={level}
                    onClick={() => setAlcoholScore(level)}
                    className={`w-full p-4 rounded-xl border text-left transition-all duration-200 flex items-center gap-4 group ${isSelected ? 'bg-[#D9FF08] border-black shadow-md' : 'bg-white border-gray-200 hover:border-black hover:bg-gray-50'}`}
                  >
                    <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold border ${isSelected ? 'bg-black text-[#D9FF08] border-black' : 'bg-gray-100 text-gray-400'}`}>{level}</div>
                    <div className="flex-1">
                      <div className={`font-bold ${isSelected ? 'text-black' : 'text-gray-900'}`}>{level}점</div>
                      <div className={`text-xs mt-0.5 ${isSelected ? 'text-black/80' : 'text-gray-500'}`}>단계별 설명을 확인하세요.</div>
                    </div>
                    {isSelected && <Check className="text-black" size={20} />}
                  </button>
                )
              })}
            </div>
          </div>
        );
      
      case 8:
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
             <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-gray-900">추천 사무용품 링크</h2>
              <div className="space-y-1">
                <p className="text-gray-500">3만원 이내 제품의 <span className="font-bold text-black">구매 링크(URL)</span>를 입력해주세요.</p>
                <p className="text-red-500 text-sm font-bold">⚠️ 미입력 시 경품 추첨 대상 제외</p>
              </div>
            </div>
            <input 
              type="text" 
              value={officeSupply}
              onChange={(e) => setOfficeSupply(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleNext()}
              placeholder="예: https://www.coupang.com/..."
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-6 py-5 text-lg text-center font-bold focus:ring-2 focus:ring-[#D9FF08] focus:border-black outline-none transition text-black"
              autoFocus
            />
          </div>
        );

      default:
        return null;
    }
  };

  const renderWizard = () => (
    <div className="max-w-md mx-auto w-full flex flex-col h-[80vh] justify-center">
      <div className="w-full bg-gray-200 rounded-full h-1.5 mb-8 overflow-hidden">
        <div className="bg-[#D9FF08] h-full transition-all duration-500" style={{ width: `${(currentStep / TOTAL_STEPS) * 100}%` }} />
      </div>

      <div className="bg-white border border-gray-100 rounded-3xl p-6 md:p-8 shadow-2xl relative min-h-[400px] flex flex-col justify-between">
        <div className="flex-1 flex flex-col justify-center">
           {renderStepContent()}
        </div>

        <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-100">
          <button onClick={handleBack} className={`flex items-center gap-2 text-gray-400 hover:text-black transition px-2 py-2 ${currentStep === 1 ? 'invisible' : 'visible'}`}>
            <ArrowLeft size={20} /><span>이전</span>
          </button>
          
          <button 
            onClick={handleNext}
            disabled={!isStepValid() || isSaving}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${isStepValid() ? 'bg-black text-[#D9FF08] shadow-lg hover:bg-gray-800' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
          >
            {isSaving ? (
              <><Loader2 size={20} className="animate-spin" /><span>저장 중...</span></>
            ) : (
              <><span>{currentStep === TOTAL_STEPS ? '완료' : '다음'}</span>{currentStep === TOTAL_STEPS ? <Check size={20} /> : <ArrowRight size={20} />}</>
            )}
          </button>
        </div>
      </div>
      
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
        <div className="inline-flex justify-center items-center w-16 h-16 rounded-full bg-gray-100 mb-6"><Lock className="text-gray-400" size={32} /></div>
        <h2 className="text-2xl font-bold mb-2">관리자 로그인</h2>
        <input 
          type="password" 
          value={passwordInput}
          onChange={(e) => setPasswordInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdminLogin()}
          placeholder="Access Code"
          className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-center text-lg mb-4 focus:ring-2 focus:ring-[#D9FF08] outline-none"
          autoFocus
        />
        {loginError && <p className="text-red-500 text-sm mb-4">코드가 올바르지 않습니다.</p>}
        <div className="flex gap-2">
           <button onClick={() => setView('FORM')} className="flex-1 py-3 bg-gray-100 rounded-lg">취소</button>
           <button onClick={handleAdminLogin} className="flex-1 py-3 bg-black text-[#D9FF08] rounded-lg">확인</button>
        </div>
      </div>
    </div>
  );

  const renderAdminDashboard = () => (
    <div className="w-full max-w-6xl mx-auto px-4 py-8 h-screen flex flex-col">
      <div className="flex justify-between items-center mb-8 shrink-0">
        <div><h1 className="text-3xl font-bold flex items-center gap-3"><LayoutGrid className="text-[#AACC00]" />명찰 데이터 관리</h1><p className="text-gray-500">총 등록 건수: {users.length}</p></div>
        <button onClick={() => setView('FORM')} className="text-gray-400 hover:text-black transition text-sm underline">입력 화면으로 돌아가기</button>
      </div>

      <div className="flex flex-wrap gap-3 mb-4 shrink-0 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-2 mr-auto text-sm text-gray-500"><CheckSquare size={16} /><span>{selectedIds.size}개 선택됨</span></div>
        <button onClick={handleDeleteSelected} disabled={selectedIds.size === 0 || isGenerating} className="px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-semibold disabled:opacity-30"><Trash2 size={16} className="inline mr-1"/>삭제</button>
        <button onClick={handleDownloadCsv} className="px-4 py-2 bg-gray-100 rounded-lg text-sm font-semibold"><Download size={16} className="inline mr-1"/>CSV</button>
        <button onClick={handleDownloadPdf} disabled={selectedIds.size === 0 || isGenerating} className="px-6 py-2 bg-black text-[#D9FF08] rounded-lg font-bold disabled:opacity-50">{isGenerating ? '생성 중...' : `PDF 다운로드 (${selectedIds.size})`}</button>
      </div>

      <div className="flex-1 overflow-auto bg-white border border-gray-200 rounded-xl shadow-inner relative">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase sticky top-0 z-10 border-b">
            <tr>
              <th className="p-4 w-12 text-center">선택</th>
              <th className="p-4">이름</th>
              <th className="p-4">MBTI</th>
              <th className="p-4">관심사</th>
              <th className="p-4 text-center">알코올</th>
              <th className="p-4">사무용품</th>
              <th className="p-4 text-right">시간</th>
            </tr>
          </thead>
          <tbody className="divide-y text-sm">
            {users.length === 0 ? (<tr><td colSpan={7} className="p-10 text-center text-gray-400">데이터가 없습니다.</td></tr>) : (
              users.map(u => {
                const isSelected = selectedIds.has(u.id);
                return (
                  <tr key={u.id} className={`transition cursor-pointer ${isSelected ? 'bg-[#D9FF08]/20' : 'hover:bg-gray-50'}`} onClick={() => toggleSelection(u.id)}>
                    <td className="p-4 text-center">{isSelected ? <CheckSquare size={20} /> : <Square size={20} />}</td>
                    <td className="p-4 font-bold">{u.name}</td>
                    <td className="p-4 font-mono">{`${u.mbtiSelection.ei}${u.mbtiSelection.ns}${u.mbtiSelection.ft}${u.mbtiSelection.jp}`}</td>
                    <td className="p-4 truncate max-w-xs">{u.interest}</td>
                    <td className="p-4 text-center font-bold">{u.alcoholScore}</td>
                    <td className="p-4 truncate max-w-xs">{u.officeSupply || '-'}</td>
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
      <div className="w-full max-w-4xl px-4 flex justify-between items-center mb-8 no-print">
        <button onClick={handleReset} className="flex items-center gap-2 px-4 py-2 bg-white border rounded-lg text-gray-600 shadow-sm"><RefreshCcw size={18} />새로 만들기</button>
        <button onClick={handleDownloadPdf} disabled={isGenerating} className="flex items-center gap-2 px-6 py-2 bg-black text-[#D9FF08] rounded-lg shadow-lg font-bold disabled:opacity-50">
          {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <Printer size={18} />}{isGenerating ? '처리 중...' : 'PDF 다운로드'}
        </button>
      </div>
      {currentUser && (
        <div className="flex flex-col items-center gap-6 no-print">
           <h2 className="text-2xl font-bold text-gray-900">명찰 미리보기</h2>
           <div className="p-4 border border-gray-200 rounded-xl bg-white shadow-2xl"><Badge user={currentUser} /></div>
           <p className="text-gray-500 text-sm">정보가 틀렸다면 '새로 만들기'를 눌러 수정하세요.</p>
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

      <div ref={printContainerRef} style={{ position: 'absolute', top: 0, left: '-10000px', width: '210mm', pointerEvents: 'none' }}>
         {printCandidates.map(u => (
            <div className="badge-capture-wrapper" key={u.id} style={{ display: 'inline-block', padding: 0 }}><Badge user={u} /></div>
         ))}
      </div>
    </div>
  );
};

export default App;
