-- Migration: Add report import and extraction fields
-- Brick: 054

-- Update weekly_team_report_attachments
ALTER TABLE public.weekly_team_report_attachments
ADD COLUMN extraction_status text CHECK (extraction_status IN ('pending', 'extracted', 'failed', 'unsupported', 'needs_manual_transcription')) DEFAULT 'pending',
ADD COLUMN extracted_text text,
ADD COLUMN extraction_error text,
ADD COLUMN extracted_at timestamptz;

-- Update weekly_team_reports
ALTER TABLE public.weekly_team_reports
ADD COLUMN import_source text CHECK (import_source IN ('manual', 'uploaded_doc', 'uploaded_pdf')) DEFAULT 'manual',
ADD COLUMN imported_attachment_id uuid REFERENCES public.weekly_team_report_attachments(id),
ADD COLUMN imported_raw_text text,
ADD COLUMN import_status text CHECK (import_status IN ('manual', 'pending_extraction', 'extracted_draft', 'needs_review', 'extraction_failed', 'approved')) DEFAULT 'manual';

-- Add comments for documentation
COMMENT ON COLUMN public.weekly_team_report_attachments.extraction_status IS 'Status do processamento de extração de texto do anexo.';
COMMENT ON COLUMN public.weekly_team_report_attachments.extracted_text IS 'Texto bruto extraído do arquivo DOCX/PDF.';
COMMENT ON COLUMN public.weekly_team_reports.import_source IS 'Origem do conteúdo do relatório: preenchimento manual ou importação de arquivo.';
COMMENT ON COLUMN public.weekly_team_reports.import_status IS 'Estado do fluxo de importação e revisão do relatório.';
