-- Migration: Create weekly_report_import_reviews table
-- Brick: 056

CREATE TABLE IF NOT EXISTS public.weekly_report_import_reviews (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id uuid REFERENCES public.weekly_team_reports(id) ON DELETE CASCADE,
    attachment_id uuid REFERENCES public.weekly_team_report_attachments(id) ON DELETE CASCADE,
    reviewer_id uuid REFERENCES auth.users(id),
    file_format text, -- docx, pdf, etc.
    used_standard_template boolean DEFAULT false,
    extraction_quality text CHECK (extraction_quality IN ('high', 'medium', 'low', 'fail')),
    sections_detected integer DEFAULT 0,
    privacy_alerts_count integer DEFAULT 0,
    manual_corrections_needed text, -- Resumo das correções feitas
    review_time_minutes integer,
    decision text CHECK (decision IN ('aprovado', 'precisa_ajuste', 'transcricao_manual', 'rejeitado')),
    feedback_category text, -- estrutura_ruim, pdf_escaneado, ausencia_secoes, etc.
    notes text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE public.weekly_report_import_reviews ENABLE ROW LEVEL SECURITY;

-- Polices: Coordination and Admin only for full access
CREATE POLICY "Reviewers can manage import reviews"
    ON public.weekly_report_import_reviews
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'coordenacao')
        )
    );

-- Comments
COMMENT ON TABLE public.weekly_report_import_reviews IS 'Registro de avaliação técnica da qualidade de importação dos relatórios semanais.';
COMMENT ON COLUMN public.weekly_report_import_reviews.decision IS 'Decisão final sobre o conteúdo importado.';
COMMENT ON COLUMN public.weekly_report_import_reviews.feedback_category IS 'Categoria de problema identificado para orientação da equipe.';
