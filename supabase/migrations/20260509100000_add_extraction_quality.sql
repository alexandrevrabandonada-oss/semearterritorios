-- Migration: Add extraction quality and score fields
-- Brick: 055

-- Update weekly_team_report_attachments
ALTER TABLE public.weekly_team_report_attachments
ADD COLUMN extraction_quality text CHECK (extraction_quality IN ('high', 'medium', 'low', 'fail')) DEFAULT 'fail',
ADD COLUMN sections_detected_count integer DEFAULT 0;

-- Update weekly_team_reports
ALTER TABLE public.weekly_team_reports
ADD COLUMN extraction_quality text CHECK (extraction_quality IN ('high', 'medium', 'low', 'fail')) DEFAULT 'fail';

-- Add comments for documentation
COMMENT ON COLUMN public.weekly_team_report_attachments.extraction_quality IS 'Classificação da qualidade da extração automática (high, medium, low, fail).';
COMMENT ON COLUMN public.weekly_team_report_attachments.sections_detected_count IS 'Número de seções identificadas no mapeamento do texto bruto.';
COMMENT ON COLUMN public.weekly_team_reports.extraction_quality IS 'Classificação agregada da qualidade da importação para facilitar a fila de revisão.';
