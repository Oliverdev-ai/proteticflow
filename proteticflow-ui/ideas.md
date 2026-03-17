# ProteticFlow UI - Brainstorm de Design

## Contexto
Sistema de gestão para laboratórios de prótese dentária. Interface SaaS B2B premium. Público-alvo: técnicos de prótese, gerentes de laboratório, administradores. Operações diárias: gestão de trabalhos, clientes, preços, financeiro, IA assistente.

---

<response>
<text>

## Ideia 1: "Clinical Precision" — Swiss Design Meets Healthcare

**Design Movement:** Estilo Suíço (International Typographic Style) aplicado a healthcare tech.

**Core Principles:**
1. Hierarquia tipográfica rígida com grid modular de 8px
2. Espaço negativo generoso como elemento de design ativo
3. Dados sempre em primeiro plano — zero decoração sem função
4. Contraste cromático para sinalização de status (urgente, atrasado, concluído)

**Color Philosophy:** Paleta clínica com acentos cirúrgicos. Base em branco puro (#FFFFFF) e cinza neutro (#F8FAFC). Azul aço (#475569) para texto. Teal (#0D9488) como cor primária — remete a instrumentos odontológicos esterilizados. Vermelho coral (#F43F5E) apenas para alertas críticos. Verde menta (#34D399) para sucesso.

**Layout Paradigm:** Sidebar vertical fixa com 64px (ícones) expandível para 240px. Grid principal de 12 colunas com gutters de 24px. Cards com cantos de 12px e sombra `0 1px 3px rgba(0,0,0,0.08)`.

**Signature Elements:**
1. Status pills com dot animado (pulsing para urgente)
2. Micro-charts sparkline inline nos cards KPI
3. Breadcrumb com separador "/" tipográfico

**Interaction Philosophy:** Transições de 200ms ease-out. Hover states com elevação sutil (+1px shadow). Focus rings visíveis para acessibilidade.

**Animation:** Fade-in sequencial nos cards (stagger 50ms). Contadores numéricos animados nos KPIs. Skeleton loading com shimmer.

**Typography System:** DM Sans (headings, 600-700) + Inter (body, 400-500). Scale: 12/14/16/20/24/32px.

</text>
<probability>0.08</probability>
</response>

---

<response>
<text>

## Ideia 2: "Atelier Digital" — Craft-Inspired Warmth

**Design Movement:** Artesanal Digital — inspira-se na precisão manual do trabalho protético, traduzindo o cuidado artesanal para a interface.

**Core Principles:**
1. Warmth over sterility — tons quentes que humanizam o software
2. Texturas sutis que remetem a materiais de laboratório (cerâmica, resina)
3. Transições orgânicas que imitam movimentos naturais
4. Hierarquia por peso visual, não por cor gritante

**Color Philosophy:** Base em off-white quente (#FAFAF8) com sidebar em slate profundo (#1E293B). Primária em âmbar dourado (#D97706) — remete ao ouro usado em próteses. Secundária em sage (#6B8F71) — natureza e saúde. Texto em charcoal (#334155). Cards em branco puro com borda 1px em #E2E8F0.

**Layout Paradigm:** Layout assimétrico com sidebar de 260px em dark mode. Área de conteúdo com max-width 1400px. Cards com border-radius de 16px e padding generoso de 24px. Seções separadas por 32px de espaço.

**Signature Elements:**
1. Ícones com stroke de 1.5px (estilo line art)
2. Badges de status com fundo pastel e texto escuro
3. Avatar com ring dourado para o usuário logado

**Interaction Philosophy:** Hover com scale(1.01) e shadow transition. Click com micro-bounce. Menus com slide-in lateral suave.

**Animation:** Page transitions com crossfade de 300ms. Cards entram com translateY(8px) → 0. Gráficos desenham progressivamente.

**Typography System:** Plus Jakarta Sans (headings, 600-700) + Nunito Sans (body, 400-500). Scale modular com ratio 1.25.

</text>
<probability>0.06</probability>
</response>

---

<response>
<text>

## Ideia 3: "Obsidian Lab" — Dark Elegance com Glassmorphism

**Design Movement:** Neo-Brutalism suavizado com glassmorphism — contraste entre a solidez do dark mode e a leveza de elementos translúcidos.

**Core Principles:**
1. Dark-first com acentos luminosos que guiam o olhar
2. Camadas de profundidade via backdrop-blur e opacidade
3. Tipografia bold como elemento arquitetural
4. Dados brilham contra o fundo escuro — máximo contraste informacional

**Color Philosophy:** Base em near-black (#0F172A) com superfícies em slate (#1E293B). Cards em glass: rgba(255,255,255,0.05) com backdrop-blur(12px). Primária em electric blue (#3B82F6). Acentos em emerald (#10B981) para positivo e rose (#F43F5E) para negativo. Texto principal em #E2E8F0.

**Layout Paradigm:** Sidebar colapsável em glass-dark. Grid com gap de 20px. Cards com border de 1px rgba(255,255,255,0.1). Border-radius de 20px para containers, 12px para elementos internos.

**Signature Elements:**
1. Glow effect sutil nos botões primários (box-shadow com cor primária)
2. Dividers com gradiente que fade nas pontas
3. Status indicators com glow pulsante

**Interaction Philosophy:** Hover com glow intensificado. Transições de 250ms cubic-bezier(0.4, 0, 0.2, 1). Tooltips com backdrop-blur.

**Animation:** Elementos entram com opacity + blur(4px→0). Números contam de 0 ao valor. Sidebar colapsa com spring animation.

**Typography System:** Outfit (headings, 600-800) + Geist Sans (body, 400-500). Tracking tight em headings, normal em body.

</text>
<probability>0.04</probability>
</response>
