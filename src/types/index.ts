export interface Job {
  id: number;
  company: string;
  position: string;
  url: string | null;
  status: 'saved' | 'applied' | 'interviewing' | 'offer' | 'rejected';
  notes: string | null;
  date_applied: string | null;
  follow_up: string | null;
  salary_min: number | null;
  salary_max: number | null;
  location: string | null;
  remote: boolean;
  created_at: string;
  updated_at: string;
}

export interface Resume {
  id: number;
  filename: string;
  content: string;
  file_path: string | null;
  created_at: string;
}

export interface MatchResult {
  id: number;
  resume_id: number;
  job_id: number | null;
  job_description: string;
  match_score: number | null;
  analysis: string | null;
  created_at: string;
}

export interface AiOutput {
  id: number;
  type: 'cover_letter' | 'interview_prep' | 'job_analysis' | 'skill_gap' | 'resume_rewrite';
  job_id: number | null;
  input_data: string;
  output: string;
  created_at: string;
}

export interface MatchAnalysis {
  score: number;
  matched_skills: string[];
  missing_skills: string[];
  suggestions: string[];
  summary: string;
}

export interface SearchResult {
  id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  url: string;
  salary_min: number | null;
  salary_max: number | null;
  created: string;
  source: string;
}
