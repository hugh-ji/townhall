import { MbtiGroup } from './types';
import { Brain, Heart, Zap, Shield } from 'lucide-react';

export const MBTI_QUESTIONS = [
  {
    key: 'ei',
    title: '에너지의 방향',
    options: [
      { value: 'E', label: 'E (외향)', desc: '사람들과 어울리며 에너지를 얻어요. "회식은 즐거워!"' },
      { value: 'I', label: 'I (내향)', desc: '혼자만의 시간으로 충전해요. "조용한 대화가 좋아."' },
    ]
  },
  {
    key: 'ns',
    title: '인식의 방식',
    options: [
      { value: 'S', label: 'S (감각)', desc: '실제 경험과 현재의 사실이 중요해요. "팩트 체크부터!"' },
      { value: 'N', label: 'N (직관)', desc: '미래의 가능성과 의미가 중요해요. "만약에 말이야..."' },
    ]
  },
  {
    key: 'ft',
    title: '판단의 근거',
    options: [
      { value: 'T', label: 'T (사고)', desc: '논리와 객관적 사실로 결정해요. "그래서 결론이 뭔데?"' },
      { value: 'F', label: 'F (감정)', desc: '사람과의 관계와 상황을 고려해요. "많이 힘들었겠구나 ㅠㅠ"' },
    ]
  },
  {
    key: 'jp',
    title: '생활 양식',
    options: [
      { value: 'J', label: 'J (판단)', desc: '계획적이고 체계적인게 편해요. "일정표대로 가자."' },
      { value: 'P', label: 'P (인식)', desc: '상황에 따라 유연하게 대처해요. "그때 가서 정하지 뭐!"' },
    ]
  }
];

// Static Metadata (Title, Icon)
export const GROUP_METADATA: Record<MbtiGroup, { 
  title: string; 
  icon: any; 
}> = {
  NT: {
    title: 'THE STRATEGIST',
    icon: Brain,
  },
  NF: {
    title: 'THE IDEALIST',
    icon: Heart,
  },
  SP: {
    title: 'THE ARTISAN',
    icon: Zap,
  },
  SJ: {
    title: 'THE GUARDIAN',
    icon: Shield,
  }
};

// Dynamic Styling Helper
export const getBadgeStyle = (group: MbtiGroup, ei: string | null) => {
  const isE = ei === 'E';

  if (group === 'NT') {
    return isE 
      ? { // ENT -> Red
          gradient: 'from-red-900 via-red-600 to-rose-500',
        }
      : { // INT -> Orange
          gradient: 'from-orange-800 via-orange-600 to-amber-500',
        };
  }
  
  if (group === 'SJ') {
    return isE
      ? { // ESJ -> Green (Brighter, Light Green/Lime)
          gradient: 'from-green-600 via-green-500 to-lime-400',
        }
      : { // ISJ -> Yellow (Bright)
          gradient: 'from-yellow-500 via-yellow-400 to-yellow-300',
        };
  }

  if (group === 'NF') {
    // Pink
    return {
      gradient: 'from-pink-600 via-pink-400 to-rose-300',
    };
  }

  // SP (Blue/Cyan) - Darker Blue
  return {
    gradient: 'from-blue-900 via-blue-700 to-cyan-700',
  };
};

export const MBTI_TITLES: Record<string, string> = {
  // Analysts
  INTJ: '용의주도한 전략가',
  INTP: '논리적인 사색가',
  ENTJ: '대담한 통솔자',
  ENTP: '뜨거운 변론가',
  
  // Diplomats
  INFJ: '선의의 옹호자',
  INFP: '열정적인 중재자',
  ENFJ: '정의로운 사회운동가',
  ENFP: '재기발랄한 활동가',
  
  // Sentinels
  ISTJ: '청렴결백 현실주의자',
  ISFJ: '용감한 수호자',
  ESTJ: '엄격한 관리자',
  ESFJ: '사교적인 외교관',
  
  // Explorers
  ISTP: '만능 재주꾼',
  ISFP: '호기심 많은 예술가',
  ESTP: '모험을 즐기는 사업가',
  ESFP: '자유로운 연예인'
};

export const BADGE_WIDTH_MM = 104;
export const BADGE_HEIGHT_MM = 129;