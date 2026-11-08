"use client";

import { useEffect } from "react";
import { LastFmSection } from "./lastfm-section";
import { TitleBanner } from "./title-banner";
import { titleBanner } from "./title-banners";

// se foda carai kkkkkkkk
const trollface = String.raw`
+QQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQ
QQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQ
QQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQ
QQQQQQQQQQQQQQQQQQQWQQQQQWWWBBBHHHHHHHHHBWWWQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQ
QQQQQQQQQQQQQQQD!\`__ssaaaaaaaaaass_ass_s____.  -~""??9VWQQQQQQQQQQQQQQQQQQQ
QQQQQQQQQQQQQP'_wmQQQWWBWV?GwwwmmWQmwwwwwgmZUVVHAqwaaaac,"?9$QQQQQQQQQQQQQQ
QQQQQQQQQQQW! aQWQQQQW?qw#TTSgwawwggywawwpY?T?TYTYTXmwwgZ$ma/-?4QQQQQQQQQQQ
QQQQQQQQQQW' jQQQQWTqwDYauT9mmwwawww?WWWWQQQQQ@TT?TVTT9HQQQQQQw,-4QQQQQQQQQ
QQQQQQQQQQ[ jQQQQQyWVw2$wWWQQQWWQWWWW7WQQQQQQQQPWWQQQWQQw7WQQQWWc)WWQQQQQQQ
QQQQQQQQQf jQQQQQWWmWmmQWU???????9WWQmWQQQQQQQWjWQQQQQQQWQmQQQQWL 4QQQQQQQQ
QQQQQQQP'.yQQQQQQQQQQQP"       <wa,.!4WQQQQQQQWdWP??!"??4WWQQQWQQc ?QWQQQQQ
QQQQQP'_a.<aamQQQW!<yF "!\` ..  "??$Qa "WQQQWTVP'    "??' =QQmWWV?46/ ?QQQQQ
QQQP'sdyWQP?!\`.-"?46mQQQQQQT!mQQgaa. <wWQQWQaa _aawmWWQQQQQQQQQWP4a7g -WWQQ
QQ[ j@mQP'adQQP4ga, -????" <jQQQQQWQQQQQQQQQWW;)WQWWWW9QQP?"\`  -?QzQ7L ]QQQ
QW jQkQ@ jWQQD'-?$QQQQQQQQQQQQQQQQQWWQWQQQWQQQc "4QQQQa   .QP4QQQQfWkl jQQQ
QE ]QkQk $D?\`  waa "?9WWQQQP??T?47\`_aamQQQQQQWWQw,-?QWWQQQQQ\`"QQQD\\Qf(.QWQQ
QQ,-Qm4Q/-QmQ6 "WWQma/  "??QQQQQQL 4W"- -?$QQQQWP\`s,awT$QQQ@  "QW@?$:.yQQQQ
QQm/-4wTQgQWQQ,  ?4WWk 4waac -???$waQQQQQQQQF??'<mWWWWWQW?^  \` ]6QQ' yQQQQQ
QQQQw,-?QmWQQQQw  a,    ?QWWQQQw _.  "????9VWaamQWV???"  a j/  ]QQf jQQQQQQ
QQQQQQw,"4QQQQQQm,-$Qa     ???4F jQQQQQwc <aaas _aaaaa 4QW ]E  )WQ\`=QQQQQQQ
QQQQQQWQ/ $QQQQQQQa ?H ]Wwa,     ???9WWWh dQWWW,=QWWU?  ?!     )WQ ]QQQQQQQ
QQQQQQQQQc-QWQQQQQW6,  QWQWQQQk <c                             jWQ ]QQQQQQQ
QQQQQQQQQQ,"$WQQWQQQQg,."?QQQQ'.mQQQmaa,.,                . .; QWQ.]QQQQQQQ
QQQQQQQQQWQa ?$WQQWQQQQQa,."?( mQQQQQQW[:QQQQm[ ammF jy! j( } jQQQ(:QQQQQQQ
QQQQQQQQQQWWma "9gw?9gdB?QQwa, -??T$WQQ;:QQQWQ ]WWD _Qf +?! _jQQQWf QQQQQQQ
QQQQQQQQQQQQQQQws "Tqau?9maZ?WQmaas,,    --~-- ---  . _ssawmQQQQQQk 3QQQQWQ
QQQQQQQQQQQQQQQQWQga,-?9mwad?1wdT9WQQQQQWVVTTYY?YTVWQQQQWWD5mQQPQQQ ]QQQQQQ
QQQQQQQWQQQQQQQQQQQWQQwa,-??$QwadV}<wBHHVHWWBHHUWWBVTTTV5awBQQD6QQQ ]QQQQQQ
QQQQQQQQQQQQQQQQQQQQQQWWQQga,-"9$WQQmmwwmBUUHTTVWBWQQQQWVT?96aQWQQQ ]QQQQQQ
QQQQQQQQQQWQQQQWQQQQQQQQQQQWQQma,-?9$QQWWQQQQQQQWmQmmmmmQWQQQQWQQW(.yQQQQQW
QQQQQQQQQQQQQWQQQQQQWQQQQQQQQQQQQQga%,.  -??9$QQQQQQQQQQQWQQWQQV? sWQQQQQQQ
QQQQQQQQQWQQQQQQQQQQQQQQWQQQQQQQQQQQWQQQQmywaa,;~^"!???????!^\`_saQWWQQQQQQQ
QQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQWWWWQQQQQmwywwwwwwmQQWQQQQQQQQQQQ
QQQQQQQWQQQWQQQQQQWQQQWQQQQQWQQQQQQQQQQQQQQQQWQQQQQWQQQWWWQQQQQQQQQQQQQQQWQ
`;

const copy = {
  "pt-br": {
    about: "sobre mim",
    aboutSummary:
      "Estudante de Ciência da Computação e desenvolvedor de software, interessado em criar soluções práticas e automatizar processos.",
    work: "experiência",
    jobRole: "analista de suporte",
    jobDate: "ago 2025 · presente",
    jobDescription:
      "Atuação no suporte técnico aos usuários do ambiente SENAC, com triagem e diagnóstico de problemas relacionados a acessos e sistemas corporativos, acompanhamento de chamados e encaminhamento de ocorrências. Participação no desenvolvimento de soluções internas para otimizar processos e simplificar rotinas operacionais.",
    location: "SP, São Paulo - Brasil",
    projects: "projetos",
    projectDetails: [
      {
        title: "roboSENAC",
        subtitle: "Extensão interna de suporte",
        technologies: "JS",
        date: "2026",
        description:
          "Reúne em um clique os dados que o analista precisa para atender um chamado: ticket e solicitante no IBM Maximo, ID do aluno e chamados similares, vindos de sistemas diferentes. Elimina a troca de telas e a cópia manual de campos.",
        impact: [
          "Busca por ID de aluno: tempo mediano reduzido de 3 minutos para 1 clique em 10 chamados reais",
          "Pesquisa de chamados similares: 5 chamados em 13 minutos → 5 minutos com a extensão",
          "Visão unificada: IBM Maximo e portais internos de suporte em uma única interface",
        ],
        href: "",
      },
      {
        title: "IncluiMais",
        subtitle: "Mapa de locais acessíveis para pessoas com deficiência ao redor da UNICID",
        technologies: "JS",
        date: "2026",
        description:
          "Permite pesquisar por nome ou categoria, filtrar recursos de acessibilidade e explorar os resultados em um mapa interativo.",
        href: "https://github.com/syndaflod/IncluiMais",
      },
      {
        title: "site",
        subtitle: "site pessoal",
        technologies: "TS, Next.js",
        date: "2026",
        description:
          "Desenvolvido com Next.js e TypeScript, reúne projetos, experiências e tecnologias, além de integrar dados musicais do Last.fm.",
        href: "https://github.com/syndaflod/site",
      },
    ],
    source: "ver código-fonte",
    stack: "stack",
    stackGroups: [
      { label: "linguagens", items: "java · javascript · typescript · python" },
      { label: "back-end", items: "spring boot · node.js" },
      { label: "front-end", items: "sveltekit · next.js" },
      { label: "dados", items: "mysql · sql" },
      { label: "integração", items: "rest apis · oslc" },
    ],
    email: "e-mail",
    github: "github",
    linkedin: "linkedin",
    backToTop: "↑ voltar ao topo",
    switchLanguage: "mudar idioma para en-us",
    languageButton: "en-us",
  },
  "en-us": {
    about: "about",
    aboutSummary:
      "computer science student and technical support analyst focused on practical software, process automation, and systems integration.",
    work: "experience",
    jobRole: "support analyst",
    jobDate: "aug 2025 · present",
    jobDescription:
      "supports users in the senac environment, diagnoses access and corporate system issues, and tracks tickets through resolution or escalation. also develops internal automations to reduce repetitive tasks.",
    location: "São Paulo, São Paulo - Brazil",
    projects: "projects",
    projectDetails: [
      {
        title: "roboSENAC",
        subtitle: "internal browser extension",
        technologies: "JavaScript · Chrome Extensions (MV3) · REST APIs",
        date: "2026",
        description:
          "automates repetitive n1 support tasks with intelligent ticket classification and ibm maximo integration, reducing manual steps for analysts. the source code is internal.",
        impact: [
          "Student ID lookup: median time reduced from 3 minutes to 1 click across 10 real tickets",
          "Similar-ticket research: 5 tickets in 13 minutes → 5 minutes with the extension",
          "Unified view: IBM Maximo and internal support portals brought into one interface",
        ],
        href: "",
      },
      {
        title: "IncluiMais",
        subtitle: "interactive accessibility map · academic project",
        technologies: "JavaScript · Leaflet · MapLibre GL JS · OpenStreetMap · Web Accessibility",
        date: "2026",
        description:
          "helps people find nearby places and explore reported accessibility features around UNICID. search by name or category, filter by access needs, and explore locations on an interactive map.",
        href: "https://github.com/syndaflod/IncluiMais",
      },
      {
        title: "Site",
        subtitle: "personal website",
        technologies: "TS, Next.js",
        date: "2026",
        description:
          "Personal site built with Next.js featuring projects, experience, and stack details, a terminal-inspired visual, and a Last.fm integration.",
        href: "https://github.com/syndaflod/site",
      },
    ],
    source: "view source code",
    stack: "stack",
    stackGroups: [
      { label: "languages", items: "java · javascript · typescript · python" },
      { label: "back-end", items: "spring boot · node.js" },
      { label: "front-end", items: "sveltekit · next.js" },
      { label: "data", items: "mysql" },
      { label: "integration", items: "rest apis · oslc" },
    ],
    email: "e-mail",
    github: "github",
    linkedin: "linkedin",
    backToTop: "↑ back to top",
    switchLanguage: "switch language to pt-br",
    languageButton: "pt-br",
  },
} as const;

function SectionHeading({ children }: { children: string }) {
  return (
    <h2 className="cli-rule">
      <span className="cli-acc" aria-hidden="true">&gt;</span>
      <span>{children}</span>
    </h2>
  );
}

export default function Home() {
  const language: keyof typeof copy = "pt-br";
  const text = copy[language];

  useEffect(() => {
    console.log(trollface);
  }, []);

  return (
    <main className="cli-root" id="top">
      <div className="cli-col">
        <TitleBanner art={titleBanner} label="Heitor Tureck de Oliveira" />

        <section className="cli-block" aria-label={text.about}>
          <SectionHeading>{text.about}</SectionHeading>
          <p className="cli-b">Heitor Tureck de Oliveira</p>
          <p>{text.location}</p>
          <p className="about-summary">{text.aboutSummary}</p>
          <p className="about-contact-links">
            <a href="mailto:heitortureckz@gmail.com">{text.email}</a>
            <span aria-hidden="true"> · </span>
            <a href="https://github.com/syndaflod" target="_blank" rel="noreferrer">{text.github}</a>
            <span aria-hidden="true"> · </span>
            <a href="https://linkedin.com/in/tureck" target="_blank" rel="noreferrer">{text.linkedin}</a>
          </p>
        </section>

        <section className="cli-block" aria-label={text.projects}>
          <SectionHeading>{text.projects}</SectionHeading>
          {text.projectDetails.map((project) => (
            <article className="project" key={project.title}>
              <div className="project-heading">
                <h3 className="cli-acc cli-b">● {project.title}</h3>
                <span className="cli-blu">{project.technologies} · {project.date}</span>
              </div>
              <p className="project-subtitle indent">{project.subtitle}</p>
              <ul className="project-bullets">
                <li>{project.description}</li>
                {"impact" in project && project.impact?.map((item) => <li key={item}>{item}</li>)}
              </ul>
              {project.href && (
                <p className="indent">
                  <a href={project.href} target="_blank" rel="noreferrer">
                    {text.source}
                  </a>
                </p>
              )}
            </article>
          ))}
        </section>

        <section className="cli-block" aria-label={text.work}>
          <SectionHeading>{text.work}</SectionHeading>
          <p className="experience-heading cli-acc cli-b">
            <span>● Digisystem · {text.jobRole}</span>
            <span className="cli-dim">{text.jobDate}</span>
          </p>
          <ul className="project-bullets work-description">
            <li>{text.jobDescription}</li>
          </ul>
        </section>

        <section className="cli-block" aria-label={text.stack}>
          <SectionHeading>{text.stack}</SectionHeading>
          <ul className="stack-list">
            {text.stackGroups.map((group) => (
              <li key={group.label}>
                <span className="stack-label">{group.label}</span>
                <span>{group.items}</span>
              </li>
            ))}
          </ul>
        </section>

        <LastFmSection language={language} />

        <footer className="cli-footer">
          <a href="#top" aria-label={text.backToTop}>
            {text.backToTop}
          </a>
          <span className="cli-footer-copyright">Official Tureck© Licensed Product 2026</span>
        </footer>
      </div>
    </main>
  );
}
