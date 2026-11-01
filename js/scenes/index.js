/* =========================================================================
   IMMERSE FIT — 場面の一覧
   各ファイルは「テンプレート」の配列を export default します。
   テンプレートの vars（バリエーション）1つが、場面1つになります。
   ========================================================================= */
import { expand } from './registry.js';
import { ALL_REAL } from '../real.js';
import hit from './hit.js';
import hit2 from './hit2.js';
import punch from './punch.js';
import push from './push.js';
import pull from './pull.js';
import lift from './lift.js';
import stir from './stir.js';
import wipe from './wipe.js';
import clap from './clap.js';
import throwing from './throw.js';
import squat from './squat.js';
import knee from './knee.js';
import kick from './kick.js';
import stomp from './stomp.js';
import jump from './jump.js';
import step from './step.js';

export const FILES = { hit, hit2, punch, push, pull, lift, stir, wipe, clap, throw: throwing, squat, knee, kick, stomp, jump, step };
export const SCENES = Object.entries(FILES).flatMap(([file, list]) => expand(file, list));
// 実写の場面（REAL_SCENES）も id で引けるように
export const SCENE_BY_ID = new Map([...SCENES, ...ALL_REAL].map(s => [s.id, s]));
export const scenesFor = (act, mode) => SCENES.filter(s => s.acts.includes(act) && (!mode || s.modes.includes(mode)));
