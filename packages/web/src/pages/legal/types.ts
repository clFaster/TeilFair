import type { ReactNode } from 'react';

export interface LegalSection {
  id: string;
  title: string;
  content: ReactNode;
}

export interface LegalDocument {
  title: string;
  summary: string;
  sections: LegalSection[];
  lastUpdated: string;
}