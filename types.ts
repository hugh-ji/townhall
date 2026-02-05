export type MbtiChar = 'E' | 'I' | 'N' | 'S' | 'F' | 'T' | 'J' | 'P';

export interface MbtiSelection {
  ei: 'E' | 'I' | null;
  ns: 'N' | 'S' | null;
  ft: 'F' | 'T' | null;
  jp: 'J' | 'P' | null;
}

export type MbtiGroup = 'NT' | 'NF' | 'SP' | 'SJ';

export interface UserData {
  id: string;
  name: string; // English name
  mbtiSelection: MbtiSelection;
  mbtiGroup: MbtiGroup;
  interest: string;
  alcoholScore: number; // 1-5
  officeSupply: string; // New field for recommendation
  timestamp: number;
  isPrinted?: boolean; // New field to track print status
}