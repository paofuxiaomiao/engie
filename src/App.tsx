import {
  Activity,
  ArrowRight,
  BatteryCharging,
  BrainCircuit,
  Car,
  CircuitBoard,
  Compass,
  Eye,
  Gauge,
  Layers3,
  Radar,
  RotateCcw,
  ScanLine,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { VehicleScene } from "./components/CellScene";
import {
  getVehicleModuleById,
  vehicleProfile,
  type ScenePart,
  type VehicleModule,
  type ViewMode,
} from "./data/vehicle";

type ModeOption = {
  id: ViewMode;
  label: string;
  Icon: LucideIcon;
};

type ModuleIconMap = Record<ScenePart, LucideIcon>;

const modeOptions: ModeOption[] = [
  { id: "assembled", label: "整车", Icon: Car },
  { id: "xray", label: "透视", Icon: ScanLine },
  { id: "focus", label: "聚焦", Icon: Eye },
];

const moduleIcons: ModuleIconMap = {
  body: Gauge,
  battery: BatteryCharging,
  drive: Activity,
  chassis: Layers3,
  adas: Radar,
  cockpit: BrainCircuit,
};

const initialModule = vehicleProfile.modules[0];

const engineTopics = [
  {
    id: "engine-principle",
    title: "发动机工作原理与基本构造",
    eyebrow: "四冲程循环",
    image: "/engine-renders/engine-principle.png",
    color: "#0f8fb3",
    summary:
      "以内燃机剖面展示气缸、活塞、曲轴、进排气通道与火花塞，帮助理解进气、压缩、做功、排气如何连续循环。",
    points: ["气缸把燃烧压力转为推力", "活塞上下运动驱动曲轴旋转", "进排气路径决定换气效率"],
  },
  {
    id: "crank-valve",
    title: "曲柄连杆机构与配气机构",
    eyebrow: "机械同步",
    image: "/engine-renders/crank-valve.png",
    color: "#f28c28",
    summary:
      "把曲轴、连杆、活塞、凸轮轴、正时链条和气门放在同一张结构图中，强调动力输出与气门开闭的时序关系。",
    points: ["连杆把直线往复变成旋转", "凸轮轴控制气门开闭节奏", "正时机构保证活塞与气门避让"],
  },
  {
    id: "fuel-ignition",
    title: "燃油供给与点火系统",
    eyebrow: "混合气形成",
    image: "/engine-renders/fuel-ignition.png",
    color: "#20b66f",
    summary:
      "展示燃油泵、燃油轨、喷油器、进气歧管、点火线圈和火花塞，让燃油、空气、电火花三条路径同时可见。",
    points: ["燃油被加压送到喷油器", "空气进入气缸形成可燃混合气", "火花塞在合适时刻点燃混合气"],
  },
  {
    id: "cooling-lubrication",
    title: "冷却系统与润滑系统",
    eyebrow: "热管理与减摩",
    image: "/engine-renders/cooling-lubrication.png",
    color: "#7c5cff",
    summary:
      "用蓝色冷却液回路和金色机油回路表现水套、散热器、水泵、油底壳、机油泵与油道的协同工作。",
    points: ["冷却液带走燃烧产生的热量", "机油在轴承和凸轮表面形成油膜", "过滤与循环决定长期可靠性"],
  },
];

function Header({ selectedModule }: { selectedModule: VehicleModule }) {
  return (
    <header className="topbar">
      <div className="brand-block">
        <span className="brand-mark" aria-hidden="true">
          <CircuitBoard size={26} />
        </span>
        <div>
          <p>Vehicle Structure Studio</p>
          <h1>SU7 风格纯电轿跑结构可视化</h1>
        </div>
      </div>

      <div className="top-metrics" aria-label="车辆参数摘要">
        {vehicleProfile.dimensions.map((item) => (
          <span key={item.label}>
            <em>{item.label}</em>
            <strong>{item.value}</strong>
          </span>
        ))}
      </div>

      <span className="active-chip" style={{ "--chip": selectedModule.color } as CSSProperties}>
        <Sparkles size={16} />
        {selectedModule.name}
      </span>
    </header>
  );
}

type ModuleRailProps = {
  selectedModuleId: string;
  onSelectModule: (id: string) => void;
};

function ModuleRail({ selectedModuleId, onSelectModule }: ModuleRailProps) {
  return (
    <aside className="left-rail">
      <section className="panel module-panel">
        <div className="panel-heading">
          <span>
            <Compass size={18} />
            结构模块
          </span>
          <small>6 systems</small>
        </div>

        <div className="module-list">
          {vehicleProfile.modules.map((module, index) => {
            const Icon = moduleIcons[module.scenePart];
            const active = selectedModuleId === module.id;
            return (
              <button
                key={module.id}
                type="button"
                className={`module-row ${active ? "is-active" : ""}`}
                style={{ "--module": module.color } as CSSProperties}
                onClick={() => onSelectModule(module.id)}
              >
                <span className="module-index">{String(index + 1).padStart(2, "0")}</span>
                <span className="module-icon">
                  <Icon size={22} />
                </span>
                <span className="module-copy">
                  <strong>{module.name}</strong>
                  <em>{module.subtitle}</em>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="panel disclaimer-panel">
        <div className="panel-heading">
          <span>
            <Sparkles size={17} />
            展示边界
          </span>
        </div>
        <p>非官方教学可视化，结构与参数基于公开资料抽象呈现；模型为程序化建模，不代表真实 CAD 数据。</p>
      </section>
    </aside>
  );
}

type StageProps = {
  selectedModule: VehicleModule;
  viewMode: ViewMode;
  autoRotate: boolean;
  resetKey: number;
  onModeChange: (mode: ViewMode) => void;
  onAutoRotateChange: (value: boolean) => void;
  onReset: () => void;
};

function Stage({
  selectedModule,
  viewMode,
  autoRotate,
  resetKey,
  onModeChange,
  onAutoRotateChange,
  onReset,
}: StageProps) {
  return (
    <main className="stage-column">
      <section className="stage-panel">
        <div className="stage-title">
          <div>
            <p>Interactive 3D Platform</p>
            <h2>{vehicleProfile.name}</h2>
          </div>

          <div className="mode-card" aria-label="视图模式">
            <span>视图模式</span>
            <div className="mode-switcher">
              {modeOptions.map(({ id, label, Icon }) => (
                <button
                  key={id}
                  type="button"
                  className={viewMode === id ? "is-active" : ""}
                  onClick={() => onModeChange(id)}
                  title={label}
                >
                  <Icon size={20} />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="selected-banner" style={{ "--module": selectedModule.color } as CSSProperties}>
          <span />
          <div>
            <strong>{selectedModule.name}</strong>
            <p>{selectedModule.subtitle}</p>
          </div>
        </div>

        <div className="canvas-wrap">
          <VehicleScene
            activeModuleId={selectedModule.id}
            viewMode={viewMode}
            autoRotate={autoRotate}
            resetKey={resetKey}
          />
        </div>

        <div className="stage-toolbar">
          <button
            type="button"
            className={autoRotate ? "is-active" : ""}
            onClick={() => onAutoRotateChange(!autoRotate)}
          >
            <RotateCcw size={18} />
            旋转
          </button>
          <button type="button" onClick={() => onModeChange("xray")}>
            <ScanLine size={18} />
            透视
          </button>
          <button type="button" onClick={() => onModeChange("focus")}>
            <Eye size={18} />
            聚焦
          </button>
          <button type="button" onClick={onReset}>
            <RotateCcw size={18} />
            重置
          </button>
        </div>
      </section>
    </main>
  );
}

type DetailPanelProps = {
  selectedModule: VehicleModule;
  exploredCount: number;
  prompt: string;
  onPrompt: (value: string) => void;
};

function buildPrompts(module: VehicleModule) {
  return [
    `用三句话解释${module.name}在整车结构中的作用。`,
    `把${module.name}和纯电平台的低重心优势联系起来讲解。`,
    `面向小学生解释为什么${module.name}需要被单独高亮。`,
  ];
}

function DetailPanel({ selectedModule, exploredCount, prompt, onPrompt }: DetailPanelProps) {
  const prompts = buildPrompts(selectedModule);
  const Icon = moduleIcons[selectedModule.scenePart];
  const progress = Math.round((exploredCount / vehicleProfile.modules.length) * 100);

  return (
    <aside className="right-rail">
      <section className="panel details-panel" style={{ "--module": selectedModule.color } as CSSProperties}>
        <div className="panel-heading">
          <span>
            <Icon size={18} />
            当前模块
          </span>
          <small>{progress}% explored</small>
        </div>

        <div className="detail-hero">
          <span className="detail-orb">
            <Icon size={28} />
          </span>
          <div>
            <h3>{selectedModule.name}</h3>
            <p>{selectedModule.subtitle}</p>
          </div>
        </div>

        <dl className="attribute-list">
          {selectedModule.attributes.map((item) => (
            <div key={item.label}>
              <dt>{item.label}</dt>
              <dd>{item.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="panel notes-panel">
        <div className="panel-heading">
          <span>结构作用</span>
        </div>
        <p>{selectedModule.note}</p>
        <div className="fact-line">
          <Sparkles size={17} />
          <span>{selectedModule.fact}</span>
        </div>
      </section>

      <section className="panel prompt-panel">
        <div className="panel-heading">
          <span>
            <BrainCircuit size={18} />
            讲解提示
          </span>
        </div>
        <div className="progress-meter" style={{ "--progress": `${progress}%` } as CSSProperties}>
          <span>
            已查看 {exploredCount}/{vehicleProfile.modules.length} 个模块
          </span>
          <i>
            <b />
          </i>
        </div>
        <div className="prompt-card">
          <strong>当前提示</strong>
          <p>{prompt}</p>
        </div>
        <div className="prompt-list">
          {prompts.map((item) => (
            <button key={item} type="button" onClick={() => onPrompt(item)}>
              {item}
            </button>
          ))}
        </div>
      </section>
    </aside>
  );
}

type BottomPanelsProps = {
  selectedModule: VehicleModule;
};

function BottomPanels({ selectedModule }: BottomPanelsProps) {
  return (
    <section className="bottom-grid">
      <div className="panel cutaway-panel">
        <div className="panel-heading">
          <span>
            <Layers3 size={18} />
            结构剖面
          </span>
          <small>imagegen asset</small>
        </div>
        <figure>
          <img src="/vehicle-renders/su7-style-cutaway.png" alt="SU7 风格纯电轿跑透明结构剖面渲染图" />
        </figure>
      </div>

      <div className="panel relation-panel" style={{ "--module": selectedModule.color } as CSSProperties}>
        <div className="panel-heading">
          <span>
            <CircuitBoard size={18} />
            模块关系
          </span>
        </div>
        <div className="relation-map">
          <span>车身</span>
          <i />
          <span>电池</span>
          <i />
          <span>电驱</span>
          <i />
          <span>轮端</span>
        </div>
        <p>
          当前聚焦 <strong>{selectedModule.name}</strong>。整车结构可理解为“车身承载 + 电池储能 + 电驱输出 +
          底盘执行 + 感知决策 + 座舱交互”的协同系统。
        </p>
        <div className="dimension-grid">
          {vehicleProfile.dimensions.map((item) => (
            <span key={item.label}>
              <em>{item.label}</em>
              <strong>{item.value}</strong>
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function Toast({ message }: { message: string | null }) {
  if (!message) {
    return null;
  }

  return <div className="toast">{message}</div>;
}

function EngineLearningSection() {
  return (
    <section className="engine-section">
      <div className="engine-head">
        <div>
          <p>Image2 Technical Learning Pack</p>
          <h2>发动机机械原理扩展</h2>
        </div>
        <span>内燃机结构教学 · 作为车辆机械基础补充</span>
      </div>

      <div className="engine-grid">
        {engineTopics.map((topic, index) => (
          <article
            key={topic.id}
            className="engine-card"
            style={{ "--topic": topic.color } as CSSProperties}
          >
            <figure>
              <img src={topic.image} alt={`${topic.title}技术示意图`} />
            </figure>
            <div className="engine-card-copy">
              <span className="engine-index">{String(index + 1).padStart(2, "0")}</span>
              <p>{topic.eyebrow}</p>
              <h3>{topic.title}</h3>
              <strong>{topic.summary}</strong>
              <ul>
                {topic.points.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default function App() {
  const [selectedModuleId, setSelectedModuleId] = useState(initialModule.id);
  const [viewMode, setViewMode] = useState<ViewMode>("assembled");
  const [autoRotate, setAutoRotate] = useState(true);
  const [resetKey, setResetKey] = useState(0);
  const [exploredModules, setExploredModules] = useState<Set<string>>(() => new Set([initialModule.id]));
  const [prompt, setPrompt] = useState(`用三句话解释${initialModule.name}在整车结构中的作用。`);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number | null>(null);

  const selectedModule = useMemo(() => getVehicleModuleById(selectedModuleId), [selectedModuleId]);

  useEffect(() => {
    setExploredModules((current) => {
      const next = new Set(current);
      next.add(selectedModule.id);
      return next;
    });
    setPrompt(`用三句话解释${selectedModule.name}在整车结构中的作用。`);
  }, [selectedModule]);

  function showToast(message: string) {
    setToast(message);
    if (toastTimer.current) {
      window.clearTimeout(toastTimer.current);
    }
    toastTimer.current = window.setTimeout(() => setToast(null), 2400);
  }

  function handlePrompt(value: string) {
    setPrompt(value);
    showToast("讲解提示已切换。");
  }

  const shellStyle = {
    "--accent": vehicleProfile.accent,
    "--accent-soft": vehicleProfile.accentSoft,
    "--module": selectedModule.color,
  } as CSSProperties;

  return (
    <div className="app-shell" style={shellStyle}>
      <Header selectedModule={selectedModule} />

      <div className="app-grid">
        <ModuleRail selectedModuleId={selectedModule.id} onSelectModule={setSelectedModuleId} />

        <div className="center-stack">
          <Stage
            selectedModule={selectedModule}
            viewMode={viewMode}
            autoRotate={autoRotate}
            resetKey={resetKey}
            onModeChange={setViewMode}
            onAutoRotateChange={setAutoRotate}
            onReset={() => {
              setResetKey((key) => key + 1);
              showToast("视角已重置。");
            }}
          />
          <BottomPanels selectedModule={selectedModule} />
        </div>

        <DetailPanel
          selectedModule={selectedModule}
          exploredCount={exploredModules.size}
          prompt={prompt}
          onPrompt={handlePrompt}
        />
      </div>

      <EngineLearningSection />
      <Toast message={toast} />
    </div>
  );
}
