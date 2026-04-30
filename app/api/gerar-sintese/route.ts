import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { month, actionsSummary, recordsData } = await request.json();

    if (!month || !recordsData) {
      return NextResponse.json({ error: "Dados incompletos passados para a IA." }, { status: 400 });
    }

    const systemPrompt = `
Você é uma inteligência artificial assistente no projeto "Semear Territórios", criada para apoiar a equipe na síntese de relatórios mensais.

OBJETIVO DA TAREFA
Elaborar uma sugestão de "Síntese Mensal" com base no mês de ${month}, organizando os dados brutos e notas da equipe recebidas de ações e escutas comunitárias.

REGRAS ESTritas DE PRIVACIDADE E SEGURANÇA:
1. Você não deve assumir nem revelar nomes de pessoas, CPFs, endereços pessoais ou telefones em nenhuma hipótese.
2. Apenas se baseie nos dados fornecidos (bairros, tipos de ações, origem da escuta, temas marcados, prioridades, e fala original do cidadão anonimizada).

REQUISITOS DA SÍNTESE ESPERADA (Formato Markdown):
1. **Resumo do Mês:** Um parágrafo introduzindo o cenário geral, quantidade de ações e pontos chave.
2. **Temas Recorrentes:** Liste os principais assuntos e preocupações trazidos.
3. **Padrões por Bairro:** Identifique desafios ou características que se repetem ou se sobressaem em territórios específicos.
4. **Frases Fortes:** Destaque 2 a 3 aspas/citações emblemáticas das falas originais, sem identificar a pessoa.
5. **Sugestão de Contexto:** Um pequeno parágrafo final pronto para ser incorporado ao Relatório Estado da Nação pela equipe.

Você deve atuar apenas como SUGESTÃO, em tom analítico e acolhedor, voltado à compreensão profunda das dinâmicas sociais da cidade.
    `.trim();

    const result = await generateText({
      model: openai("gpt-4o-mini"),
      system: systemPrompt,
      prompt: `Dados das Ações:\n${JSON.stringify(actionsSummary)}\n\nDados das Escutas (Sanitizados):\n${JSON.stringify(recordsData)}`,
      temperature: 0.7
    });

    return NextResponse.json({ text: result.text });
  } catch (error) {
    console.error("Erro ao gerar síntese:", error);
    return NextResponse.json(
      { error: "Ocorreu um erro ao processar a geração com a IA." },
      { status: 500 }
    );
  }
}
