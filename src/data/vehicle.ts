export type ViewMode = "assembled" | "xray" | "focus";

export type ScenePart =
  | "body"
  | "battery"
  | "drive"
  | "chassis"
  | "adas"
  | "cockpit";

export type VehicleModule = {
  id: string;
  name: string;
  subtitle: string;
  color: string;
  scenePart: ScenePart;
  attributes: Array<{
    label: string;
    value: string;
  }>;
  note: string;
  fact: string;
};

export type VehicleProfile = {
  id: string;
  name: string;
  type: string;
  accent: string;
  accentSoft: string;
  dimensions: Array<{
    label: string;
    value: string;
  }>;
  modules: VehicleModule[];
};

export const vehicleProfile: VehicleProfile = {
  id: "su7-style",
  name: "SU7 风格纯电轿跑",
  type: "非官方教学可视化 · 参考公开参数与轿跑比例抽象呈现",
  accent: "#0f8fb3",
  accentSoft: "#e7f8fc",
  dimensions: [
    { label: "车长", value: "约 4997 mm" },
    { label: "车宽", value: "约 1963 mm" },
    { label: "轴距", value: "约 3000 mm" },
    { label: "风阻", value: "Cd 0.195 参考" },
  ],
  modules: [
    {
      id: "body",
      name: "车身与空气动力",
      subtitle: "低趴流线外壳与透明结构层",
      color: "#0f8fb3",
      scenePart: "body",
      attributes: [
        { label: "比例", value: "长轴距低重心轿跑" },
        { label: "表达", value: "透明车壳 + 气流线" },
        { label: "关注", value: "风阻、舱体、车身姿态" },
      ],
      note:
        "车身层用半透明外壳表达整体比例，配合前舱、座舱和溜背线条，让学习者先建立整车轮廓，再进入内部结构。",
      fact:
        "真实量产车的空气动力设计会综合外形、底部护板、轮辋、风道和尾部收束，而不是只看车头曲线。",
    },
    {
      id: "battery",
      name: "电池与 CTB 底盘",
      subtitle: "地板电池包与车身一体化承载",
      color: "#11a8c7",
      scenePart: "battery",
      attributes: [
        { label: "位置", value: "乘员舱下方地板" },
        { label: "优势", value: "低重心、长轴距布置" },
        { label: "可视化", value: "电芯矩阵 + 底部护板" },
      ],
      note:
        "电池包位于地板中央，是纯电平台最关键的结构之一。第一版用模块化电芯矩阵表现能量储存与底盘承载的关系。",
      fact:
        "纯电车型的电池位置通常会显著影响坐姿、底盘高度、整车重心和碰撞保护路径。",
    },
    {
      id: "drive",
      name: "电驱与电控",
      subtitle: "前后电机、逆变器与高压线路",
      color: "#f28c28",
      scenePart: "drive",
      attributes: [
        { label: "组成", value: "电机、减速器、电控" },
        { label: "布局", value: "前后驱动单元抽象" },
        { label: "连接", value: "高压橙色线束" },
      ],
      note:
        "电驱模块将电池能量转化为车轮扭矩。舞台中以前后驱动单元和高压线束展示电池、电控、车轮之间的能量路径。",
      fact:
        "橙色线束通常用于提示高压系统，是电动车结构识别中非常直观的视觉线索。",
    },
    {
      id: "chassis",
      name: "悬架与制动",
      subtitle: "轮端、弹簧、制动盘与底盘骨架",
      color: "#4b5f76",
      scenePart: "chassis",
      attributes: [
        { label: "轮端", value: "四轮独立结构抽象" },
        { label: "制动", value: "制动盘 + 卡钳高亮" },
        { label: "支撑", value: "前后副车架与纵梁" },
      ],
      note:
        "悬架与制动决定车辆如何支撑、转向、吸收路面冲击并释放动能。这里用轮端、弹簧和底盘骨架做可读化表达。",
      fact:
        "电动车除了机械制动，还会通过电机回收部分动能，因此制动体验由机械与电控共同决定。",
    },
    {
      id: "adas",
      name: "智能驾驶感知",
      subtitle: "激光雷达、摄像头与周向传感器",
      color: "#20b66f",
      scenePart: "adas",
      attributes: [
        { label: "顶部", value: "激光雷达造型抽象" },
        { label: "前向", value: "挡风玻璃摄像头" },
        { label: "周向", value: "侧向感知节点" },
      ],
      note:
        "感知模块被放在车顶、前挡风玻璃、车头和两侧，用绿色信号点展示车辆如何观察周围环境。",
      fact:
        "智驾系统通常需要融合摄像头、雷达、定位和地图等信息，单个传感器并不能完整理解道路环境。",
    },
    {
      id: "cockpit",
      name: "智能座舱",
      subtitle: "座椅、方向盘、中控屏与人机交互",
      color: "#7c5cff",
      scenePart: "cockpit",
      attributes: [
        { label: "空间", value: "前后排座舱抽象" },
        { label: "交互", value: "中控屏 + 驾驶位" },
        { label: "关系", value: "与感知/电控联动" },
      ],
      note:
        "智能座舱把车辆状态、导航、娱乐和辅助驾驶信息集中呈现，是用户最直接接触车辆技术的界面。",
      fact:
        "现代电动车座舱越来越像移动计算平台，软件体验会持续改变车辆使用方式。",
    },
  ],
};

export function getVehicleModuleById(id: string) {
  return vehicleProfile.modules.find((module) => module.id === id) ?? vehicleProfile.modules[0];
}
