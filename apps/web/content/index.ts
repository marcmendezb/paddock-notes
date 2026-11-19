import type { MDXContent } from "mdx/types";
import type { Lang } from "@paddock/shared";
import GuideEs from "./es/guide.mdx";
import UndercutOvercutEs from "./es/undercut-overcut.mdx";
import TyreDegradationEs from "./es/tyre-degradation.mdx";
import TyreCompoundsEs from "./es/tyre-compounds.mdx";
import QualifyingEs from "./es/qualifying.mdx";
import SprintEs from "./es/sprint.mdx";
import SafetyCarEs from "./es/safety-car.mdx";
import DirtyAirEs from "./es/dirty-air.mdx";
import TelemetryEs from "./es/telemetry.mdx";
import PointsEs from "./es/points.mdx";
import PenaltiesEs from "./es/penalties.mdx";
import DeltaEs from "./es/delta.mdx";
import OvertakeModeEs from "./es/overtake-mode.mdx";
import GuideEn from "./en/guide.mdx";
import UndercutOvercutEn from "./en/undercut-overcut.mdx";
import TyreDegradationEn from "./en/tyre-degradation.mdx";
import TyreCompoundsEn from "./en/tyre-compounds.mdx";
import QualifyingEn from "./en/qualifying.mdx";
import SprintEn from "./en/sprint.mdx";
import SafetyCarEn from "./en/safety-car.mdx";
import DirtyAirEn from "./en/dirty-air.mdx";
import TelemetryEn from "./en/telemetry.mdx";
import PointsEn from "./en/points.mdx";
import PenaltiesEn from "./en/penalties.mdx";
import DeltaEn from "./en/delta.mdx";
import OvertakeModeEn from "./en/overtake-mode.mdx";
import GuideDe from "./de/guide.mdx";
import UndercutOvercutDe from "./de/undercut-overcut.mdx";
import TyreDegradationDe from "./de/tyre-degradation.mdx";
import TyreCompoundsDe from "./de/tyre-compounds.mdx";
import QualifyingDe from "./de/qualifying.mdx";
import SprintDe from "./de/sprint.mdx";
import SafetyCarDe from "./de/safety-car.mdx";
import DirtyAirDe from "./de/dirty-air.mdx";
import TelemetryDe from "./de/telemetry.mdx";
import PointsDe from "./de/points.mdx";
import PenaltiesDe from "./de/penalties.mdx";
import DeltaDe from "./de/delta.mdx";
import OvertakeModeDe from "./de/overtake-mode.mdx";

export { EXPLAINERS, GUIDE_SLUG, type Explainer } from "@paddock/shared";

const BODIES: Record<Lang, Record<string, MDXContent>> = {
  es: {
    "guide": GuideEs,
    "undercut-overcut": UndercutOvercutEs,
    "tyre-degradation": TyreDegradationEs,
    "tyre-compounds": TyreCompoundsEs,
    "qualifying": QualifyingEs,
    "sprint": SprintEs,
    "safety-car": SafetyCarEs,
    "dirty-air": DirtyAirEs,
    "telemetry": TelemetryEs,
    "points": PointsEs,
    "penalties": PenaltiesEs,
    "delta": DeltaEs,
    "overtake-mode": OvertakeModeEs,
  },
  en: {
    "guide": GuideEn,
    "undercut-overcut": UndercutOvercutEn,
    "tyre-degradation": TyreDegradationEn,
    "tyre-compounds": TyreCompoundsEn,
    "qualifying": QualifyingEn,
    "sprint": SprintEn,
    "safety-car": SafetyCarEn,
    "dirty-air": DirtyAirEn,
    "telemetry": TelemetryEn,
    "points": PointsEn,
    "penalties": PenaltiesEn,
    "delta": DeltaEn,
    "overtake-mode": OvertakeModeEn,
  },
  de: {
    "guide": GuideDe,
    "undercut-overcut": UndercutOvercutDe,
    "tyre-degradation": TyreDegradationDe,
    "tyre-compounds": TyreCompoundsDe,
    "qualifying": QualifyingDe,
    "sprint": SprintDe,
    "safety-car": SafetyCarDe,
    "dirty-air": DirtyAirDe,
    "telemetry": TelemetryDe,
    "points": PointsDe,
    "penalties": PenaltiesDe,
    "delta": DeltaDe,
    "overtake-mode": OvertakeModeDe,
  },
};

export function explainerBody(lang: Lang, slug: string): MDXContent | null {
  return BODIES[lang][slug] ?? null;
}
