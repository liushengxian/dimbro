import { BALANCE } from '../data/balance';
import { CHARACTERS_BY_ID } from '../data/characters';
import { ENEMIES_BY_ID } from '../data/enemies';
import { WEAPONS_BY_ID } from '../data/weapons';
import type {
  BattleWorld,
  DamageText,
  EffectKind,
  EnemyDef,
  EnemyEntity,
  EnemyId,
  HazardEntity,
  PickupEntity,
  PlayerStats,
  ProjectileEntity,
  RunState,
  SpawnWarning,
  WaveDef,
  WeaponDef,
  WeaponId,
  WeaponRuntime,
} from '../types';
import type { Rng } from '../core/rng';
import {
  computePlayerStats,
  mitigateArmor,
  weaponCooldown,
  weaponDamage,
  type RuntimeModifiers,
} from './progression';

export interface BattleInput {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
}

export type BattleOutcome = 'waveClear' | 'victory' | 'defeat' | null;

const WORLD_WIDTH = BALANCE.worldWidth;
const WORLD_HEIGHT = BALANCE.worldHeight;
const TWO_PI = Math.PI * 2;

export function createBattle(run: RunState, wave: WaveDef): BattleWorld {
  const stats = computePlayerStats(run);
  const hp = Math.max(1, Math.min(stats.maxHp, run.currentHp));
  const world: BattleWorld = {
    wave: wave.wave,
    elapsed: 0,
    timeLeft: wave.duration ?? 0,
    duration: wave.duration,
    bossWave: wave.boss,
    player: {
      x: WORLD_WIDTH / 2,
      y: WORLD_HEIGHT / 2,
      radius: BALANCE.playerRadius,
      hp,
      iframes: 0,
      facingX: 1,
      facingY: 0,
      hitFlash: 0,
      regenAccumulator: 0,
      trail: [],
    },
    weapons: run.weapons.map((weapon, index) => ({
      id: weapon.id,
      level: weapon.level,
      cooldown: index * 0.08,
      cooldownTotal: weaponCooldown(
        WEAPONS_BY_ID[weapon.id],
        weapon.level,
        stats,
        false,
      ),
    })),
    enemies: [],
    playerProjectiles: [],
    enemyProjectiles: [],
    pickups: [],
    hazards: [],
    effects: [],
    damageTexts: [],
    spawnWarnings: [],
    spawnBudget: Math.max(0, wave.budget - wave.eliteAt.length * 8),
    spawnTimer: 0.8,
    spawnLocked: false,
    eliteSchedule: [...wave.eliteAt],
    bossId: null,
    bossDefeated: false,
    victoryTimer: null,
    attackCounter: 0,
    rolledAttacks: new Set<number>(),
    passive: {
      resetActive: false,
      resetRemaining: 0,
      resetMax: BALANCE.resetMaxDuration,
      moveHold: 0,
      idleTime: 0,
      lightTrailActive: false,
    },
    waveStats: {
      pickedCoins: 0,
      reward: 0,
      simonRepairCoins: 0,
      lostCoins: 0,
      shieldsGained: 0,
      kills: 0,
      damage: 0,
      duration: 0,
    },
    nextId: 1,
    fps: 60,
  };

  if (wave.boss) {
    const bossDef = ENEMIES_BY_ID.forgeCore;
    spawnEnemy(world, wave.wave, bossDef, WORLD_WIDTH / 2, WORLD_HEIGHT / 2 - 40);
  }

  return world;
}

export function updateBattle(
  run: RunState,
  world: BattleWorld,
  wave: WaveDef,
  dt: number,
  input: BattleInput,
  rng: Rng,
): BattleOutcome {
  if (world.bossDefeated) {
    updateVisuals(world, dt);
    if (world.victoryTimer !== null) {
      world.victoryTimer -= dt;
      if (world.victoryTimer <= 0) return 'victory';
    }
    return null;
  }

  world.elapsed += dt;
  world.waveStats.duration = world.elapsed;

  updatePassive(run, world, dt, input);

  const stats = getBattleStats(run, world);
  world.player.hp = Math.min(stats.maxHp, world.player.hp);

  updatePlayerMovement(world, stats, dt, input);
  updatePlayerRegen(world, stats, dt);
  updateWeapons(run, world, stats, dt, rng);
  updateProjectiles(world, dt);
  updateEnemies(run, world, dt, rng);
  updateSpawnWarnings(run, world, wave, dt);
  updateSpawner(run, world, wave, dt, rng);
  updatePickups(run, world, stats, dt);
  updateHazards(run, world, stats, dt);
  updateVisuals(world, dt);
  resolveCollisions(run, world, stats, rng);
  separateEnemies(world, dt);
  cleanup(world);

  run.currentHp = Math.max(0, Math.min(getBattleStats(run, world).maxHp, world.player.hp));

  if (world.player.hp <= 0) return 'defeat';

  if (world.duration !== null) {
    world.timeLeft = Math.max(0, world.timeLeft - dt);
    if (world.timeLeft <= 0) return 'waveClear';
  }

  return null;
}

function getBattleStats(run: RunState, world: BattleWorld): PlayerStats {
  const mods: RuntimeModifiers = {
    damagePct: world.passive.resetActive ? BALANCE.resetDamageBonus : 0,
    moveSpeedPct: world.passive.lightTrailActive ? BALANCE.lightTrailMoveSpeedPct : 0,
    critChance: world.passive.lightTrailActive ? BALANCE.lightTrailCritChance : 0,
  };
  return computePlayerStats(run, mods);
}

function updatePassive(run: RunState, world: BattleWorld, dt: number, input: BattleInput): void {
  if (run.characterId !== 'sunsetNeedle') {
    world.passive.resetActive = false;
    world.passive.resetRemaining = 0;
    world.passive.lightTrailActive = false;
    world.passive.moveHold = 0;
    world.passive.idleTime = 0;
    return;
  }

  if (world.passive.resetActive) {
    world.passive.resetRemaining -= dt;
    if (world.passive.resetRemaining <= 0) {
      world.passive.resetActive = false;
      world.passive.resetRemaining = 0;
    }
  }

  const moving = input.up || input.down || input.left || input.right;
  if (moving) {
    world.passive.idleTime = 0;
    if (!world.passive.lightTrailActive) {
      world.passive.moveHold += dt;
      if (world.passive.moveHold >= BALANCE.lightTrailMoveHold) {
        world.passive.lightTrailActive = true;
        world.passive.moveHold = BALANCE.lightTrailMoveHold;
        addEffect(world, 'ring', world.player.x, world.player.y, {
          radius: 34,
          life: 0.24,
          color: CHARACTERS_BY_ID.sunsetNeedle.palette.glow,
        });
      }
    }
  } else {
    world.passive.moveHold = 0;
    if (world.passive.lightTrailActive) {
      world.passive.idleTime += dt;
      if (world.passive.idleTime >= BALANCE.lightTrailIdleGrace) {
        world.passive.lightTrailActive = false;
        world.passive.idleTime = 0;
      }
    } else {
      world.passive.idleTime = 0;
    }
  }

  for (const ghost of world.player.trail) ghost.age += dt;
  world.player.trail = world.player.trail.filter((ghost) => ghost.age < 0.4);
  if (world.passive.lightTrailActive) {
    const last = world.player.trail[world.player.trail.length - 1];
    if (!last || Math.hypot(world.player.x - last.x, world.player.y - last.y) > 10) {
      world.player.trail.push({ x: world.player.x, y: world.player.y, age: 0 });
      if (world.player.trail.length > 10) world.player.trail.shift();
    }
  }
}

function updatePlayerMovement(
  world: BattleWorld,
  stats: PlayerStats,
  dt: number,
  input: BattleInput,
): void {
  const dx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  const dy = (input.down ? 1 : 0) - (input.up ? 1 : 0);
  const length = Math.hypot(dx, dy);
  if (length > 0) {
    const nx = dx / length;
    const ny = dy / length;
    const speed = stats.moveSpeed * (1 + stats.moveSpeedPct);
    world.player.x += nx * speed * dt;
    world.player.y += ny * speed * dt;
    world.player.facingX = nx;
    world.player.facingY = ny;
  }

  const limitX = WORLD_WIDTH - BALANCE.margin - world.player.radius;
  const limitY = WORLD_HEIGHT - BALANCE.margin - world.player.radius;
  world.player.x = clamp(world.player.x, BALANCE.margin + world.player.radius, limitX);
  world.player.y = clamp(world.player.y, BALANCE.margin + world.player.radius, limitY);
  world.player.iframes = Math.max(0, world.player.iframes - dt);
  world.player.hitFlash = Math.max(0, world.player.hitFlash - dt);
}

function updatePlayerRegen(world: BattleWorld, stats: PlayerStats, dt: number): void {
  if (stats.regen <= 0) return;
  world.player.regenAccumulator += stats.regen * dt;
  if (world.player.regenAccumulator >= 1) {
    const heal = Math.floor(world.player.regenAccumulator);
    world.player.regenAccumulator -= heal;
    world.player.hp = Math.min(stats.maxHp, world.player.hp + heal);
  }
}

function updateWeapons(
  run: RunState,
  world: BattleWorld,
  stats: PlayerStats,
  dt: number,
  rng: Rng,
): void {
  for (const weapon of world.weapons) {
    weapon.cooldown = Math.max(0, weapon.cooldown - dt);
    if (weapon.cooldown > 0) continue;

    const def = WEAPONS_BY_ID[weapon.id];
    const range = def.range * (1 + stats.rangePct);
    const target = findNearestEnemy(world, world.player.x, world.player.y, range);
    if (!target) continue;

    fireWeapon(run, world, stats, weapon, def, target, range, rng);
    const cooldown = weaponCooldown(def, weapon.level, stats, world.passive.resetActive);
    weapon.cooldown = cooldown;
    weapon.cooldownTotal = cooldown;
  }
}

function fireWeapon(
  run: RunState,
  world: BattleWorld,
  stats: PlayerStats,
  weapon: WeaponRuntime,
  def: WeaponDef,
  target: EnemyEntity,
  range: number,
  rng: Rng,
): void {
  const attackId = ++world.attackCounter;
  const player = world.player;
  const angle = Math.atan2(target.y - player.y, target.x - player.x);
  const muzzleX = player.x + Math.cos(angle) * (player.radius + 4);
  const muzzleY = player.y + Math.sin(angle) * (player.radius + 4);

  addEffect(world, 'muzzle', muzzleX, muzzleY, {
    radius: def.behavior === 'shotgun' ? 15 : 9,
    life: 0.12,
    color: def.color,
    angle,
  });

  if (def.behavior === 'melee') {
    const spread = (def.spreadDeg * Math.PI) / 180;
    let hitAny = false;
    for (const enemy of world.enemies) {
      if (enemy.dead) continue;
      const distance = Math.hypot(enemy.x - player.x, enemy.y - player.y);
      if (distance > range + enemy.radius) continue;
      const enemyAngle = Math.atan2(enemy.y - player.y, enemy.x - player.x);
      if (Math.abs(normalizeAngle(enemyAngle - angle)) > spread / 2) continue;

      const crit = rng.chance(stats.critChance);
      const damage = weaponDamage(def, weapon.level, stats, crit);
      const hit = damageEnemy(world, run, enemy, damage, {
        canBounce: true,
        source: 'direct',
        crit,
      });
      if (hit) {
        hitAny = true;
        const nx = (enemy.x - player.x) / (distance || 1);
        const ny = (enemy.y - player.y) / (distance || 1);
        const force = def.knockback * (1 + stats.knockbackPct);
        enemy.pushX += nx * force;
        enemy.pushY += ny * force;
      }
    }
    if (hitAny) tryResetTrigger(run, world, attackId, rng);
    addEffect(world, 'arc', player.x, player.y, {
      radius: range,
      life: 0.2,
      color: def.color,
      angle,
    });
    return;
  }

  if (def.behavior === 'shotgun') {
    const spread = (def.spreadDeg * Math.PI) / 180;
    for (let index = 0; index < def.pelletCount; index += 1) {
      const ratio = def.pelletCount === 1 ? 0 : index / (def.pelletCount - 1) - 0.5;
      const pelletAngle = angle + ratio * spread;
      spawnPlayerProjectile(world, run, stats, def, weapon.level, pelletAngle, range, attackId, rng);
    }
    return;
  }

  spawnPlayerProjectile(world, run, stats, def, weapon.level, angle, range, attackId, rng);
}

function spawnPlayerProjectile(
  world: BattleWorld,
  _run: RunState,
  stats: PlayerStats,
  def: WeaponDef,
  level: number,
  angle: number,
  range: number,
  attackId: number,
  rng: Rng,
): void {
  if (world.playerProjectiles.length >= BALANCE.maxPlayerProjectiles) return;
  const crit = rng.chance(stats.critChance);
  const damage = weaponDamage(def, level, stats, crit);
  const speed = def.projectileSpeed || 500;
  const boomerang = def.behavior === 'boomerang';
  const life = boomerang ? (range * 2) / speed + 0.3 : range / speed;
  const projectile: ProjectileEntity = {
    id: nextId(world),
    kind: 'player',
    x: world.player.x + Math.cos(angle) * (world.player.radius + 6),
    y: world.player.y + Math.sin(angle) * (world.player.radius + 6),
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    radius: def.projectileRadius,
    damage,
    crit,
    remainingPierce: Math.max(1, def.pierce),
    hitIds: new Set<number>(),
    life,
    maxLife: life,
    weaponId: def.id,
    attackId,
    color: def.color,
    returning: false,
    traveled: 0,
    maxDistance: range,
    originX: world.player.x,
    originY: world.player.y,
    dead: false,
  };
  world.playerProjectiles.push(projectile);
}

function tryResetTrigger(
  run: RunState,
  world: BattleWorld,
  attackId: number,
  rng: Rng,
): void {
  if (run.characterId !== 'sunsetNeedle') return;
  if (world.rolledAttacks.has(attackId)) return;
  world.rolledAttacks.add(attackId);
  if (world.passive.resetActive) return;
  if (!rng.chance(BALANCE.resetChance)) return;

  world.passive.resetActive = true;
  world.passive.resetRemaining = BALANCE.resetDuration;
  world.passive.resetMax = BALANCE.resetMaxDuration;
  addEffect(world, 'reset', world.player.x, world.player.y, {
    radius: 78,
    life: 0.45,
    color: CHARACTERS_BY_ID.sunsetNeedle.palette.glow,
  });
}

function extendReset(world: BattleWorld): void {
  if (!world.passive.resetActive) return;
  world.passive.resetRemaining = Math.min(
    BALANCE.resetMaxDuration,
    world.passive.resetRemaining + BALANCE.resetKillExtension,
  );
  addEffect(world, 'ring', world.player.x, world.player.y, {
    radius: 42,
    life: 0.18,
    color: CHARACTERS_BY_ID.sunsetNeedle.palette.glow,
  });
}

function updateProjectiles(world: BattleWorld, dt: number): void {
  for (const projectile of world.playerProjectiles) {
    if (projectile.dead) continue;
    if (projectile.weaponId === 'returnGear') {
      const def = WEAPONS_BY_ID.returnGear;
      if (!projectile.returning) {
        projectile.x += projectile.vx * dt;
        projectile.y += projectile.vy * dt;
        projectile.traveled += Math.hypot(projectile.vx, projectile.vy) * dt;
        projectile.life -= dt;
        if (projectile.traveled >= projectile.maxDistance) {
          projectile.returning = true;
          projectile.hitIds.clear();
          projectile.remainingPierce = Math.max(1, def.pierce);
          projectile.damage *= 0.5;
          const angle = Math.atan2(
            world.player.y - projectile.y,
            world.player.x - projectile.x,
          );
          projectile.vx = Math.cos(angle) * def.projectileSpeed;
          projectile.vy = Math.sin(angle) * def.projectileSpeed;
        }
      } else {
        const angle = Math.atan2(
          world.player.y - projectile.y,
          world.player.x - projectile.x,
        );
        projectile.vx = Math.cos(angle) * def.projectileSpeed;
        projectile.vy = Math.sin(angle) * def.projectileSpeed;
        projectile.x += projectile.vx * dt;
        projectile.y += projectile.vy * dt;
        projectile.life -= dt;
        if (
          Math.hypot(projectile.x - world.player.x, projectile.y - world.player.y) <
          world.player.radius + projectile.radius + 6
        ) {
          projectile.dead = true;
        }
      }
      continue;
    }

    projectile.x += projectile.vx * dt;
    projectile.y += projectile.vy * dt;
    projectile.life -= dt;
    if (
      projectile.life <= 0 ||
      projectile.x < -40 ||
      projectile.x > WORLD_WIDTH + 40 ||
      projectile.y < -40 ||
      projectile.y > WORLD_HEIGHT + 40
    ) {
      projectile.dead = true;
    }
  }

  for (const projectile of world.enemyProjectiles) {
    projectile.x += projectile.vx * dt;
    projectile.y += projectile.vy * dt;
    projectile.life -= dt;
    if (
      projectile.life <= 0 ||
      projectile.x < -40 ||
      projectile.x > WORLD_WIDTH + 40 ||
      projectile.y < -40 ||
      projectile.y > WORLD_HEIGHT + 40
    ) {
      projectile.dead = true;
    }
  }
}

function updateEnemies(run: RunState, world: BattleWorld, dt: number, rng: Rng): void {
  if (world.bossDefeated) return;

  for (const enemy of world.enemies) {
    if (enemy.dead) continue;
    enemy.hitFlash = Math.max(0, enemy.hitFlash - dt);
    enemy.invuln = Math.max(0, enemy.invuln - dt);
    enemy.pushX *= Math.max(0, 1 - dt * 8);
    enemy.pushY *= Math.max(0, 1 - dt * 8);
    enemy.x += enemy.pushX * dt;
    enemy.y += enemy.pushY * dt;

    if (enemy.boss) {
      updateBoss(world, enemy, dt, rng);
    } else {
      updateRegularEnemy(world, enemy, dt, rng);
    }

    clampEnemy(enemy);
  }

  resolveContactDamage(run, world);
}

function updateRegularEnemy(world: BattleWorld, enemy: EnemyEntity, dt: number, rng: Rng): void {
  const def = ENEMIES_BY_ID[enemy.defId];
  const dx = world.player.x - enemy.x;
  const dy = world.player.y - enemy.y;
  const distance = Math.hypot(dx, dy) || 1;
  const nx = dx / distance;
  const ny = dy / distance;
  enemy.angle = Math.atan2(dy, dx);

  switch (def.behavior) {
    case 'chaser': {
      moveEnemy(enemy, nx, ny, enemy.speed, dt);
      break;
    }
    case 'weaver': {
      const weave = Math.sin(world.elapsed * 5.2 + enemy.id * 1.7) * 0.62;
      const wx = nx - ny * weave;
      const wy = ny + nx * weave;
      const length = Math.hypot(wx, wy) || 1;
      moveEnemy(enemy, wx / length, wy / length, enemy.speed, dt);
      break;
    }
    case 'charger': {
      updateCharger(world, enemy, dt, distance, nx, ny);
      break;
    }
    case 'spitter': {
      updateSpitter(world, enemy, dt, distance, nx, ny, rng);
      break;
    }
    case 'overseer': {
      updateOverseer(world, enemy, dt, nx, ny);
      break;
    }
    default:
      break;
  }
}

function updateCharger(
  world: BattleWorld,
  enemy: EnemyEntity,
  dt: number,
  distance: number,
  nx: number,
  ny: number,
): void {
  if (enemy.mode === 'telegraph') {
    enemy.modeTimer -= dt;
    if (enemy.modeTimer <= 0) {
      enemy.mode = 'dash';
      enemy.modeTimer = 0.45;
      enemy.dirX = nx;
      enemy.dirY = ny;
    }
    return;
  }

  if (enemy.mode === 'dash') {
    moveEnemy(enemy, enemy.dirX, enemy.dirY, 220, dt);
    enemy.modeTimer -= dt;
    const hitWall = clampEnemy(enemy);
    if (hitWall) {
      enemy.mode = 'stunned';
      enemy.modeTimer = 1;
      addEffect(world, 'ring', enemy.x, enemy.y, {
        radius: 28,
        life: 0.28,
        color: ENEMIES_BY_ID.charger.accent,
      });
    } else if (enemy.modeTimer <= 0) {
      enemy.mode = 'stunned';
      enemy.modeTimer = 0.45;
    }
    return;
  }

  if (enemy.mode === 'stunned') {
    enemy.modeTimer -= dt;
    if (enemy.modeTimer <= 0) {
      enemy.mode = 'chase';
      enemy.attackTimer = 2.2;
    }
    return;
  }

  moveEnemy(enemy, nx, ny, enemy.speed, dt);
  enemy.attackTimer -= dt;
  if (enemy.attackTimer <= 0 && distance < 390) {
    enemy.mode = 'telegraph';
    enemy.modeTimer = 0.5;
    enemy.dirX = nx;
    enemy.dirY = ny;
    addEffect(world, 'ring', enemy.x, enemy.y, {
      radius: 30,
      life: 0.5,
      color: ENEMIES_BY_ID.charger.accent,
    });
  }
}

function updateSpitter(
  world: BattleWorld,
  enemy: EnemyEntity,
  dt: number,
  distance: number,
  nx: number,
  ny: number,
  _rng: Rng,
): void {
  if (distance > 275) {
    moveEnemy(enemy, nx, ny, enemy.speed, dt);
  } else if (distance < 205) {
    moveEnemy(enemy, -nx, -ny, enemy.speed * 0.9, dt);
  } else {
    moveEnemy(enemy, -ny, nx, enemy.speed * 0.35, dt);
  }

  enemy.attackTimer -= dt;
  if (enemy.attackTimer <= 0 && distance < 520) {
    enemy.attackTimer = 2.2;
    spawnEnemyProjectile(
      world,
      enemy.x,
      enemy.y,
      enemy.angle,
      235,
      6 * waveDamageScale(world.wave),
      5,
      ENEMIES_BY_ID.spitter.accent,
    );
    addEffect(world, 'muzzle', enemy.x, enemy.y, {
      radius: 10,
      life: 0.12,
      color: ENEMIES_BY_ID.spitter.accent,
      angle: enemy.angle,
    });
  }
}

function updateOverseer(
  world: BattleWorld,
  enemy: EnemyEntity,
  dt: number,
  nx: number,
  ny: number,
): void {
  moveEnemy(enemy, nx, ny, enemy.speed, dt);
  enemy.attackTimer -= dt;
  if (enemy.attackTimer <= 0) {
    enemy.attackTimer = 4;
    for (let index = 0; index < 8; index += 1) {
      const angle = (index / 8) * TWO_PI + world.elapsed * 0.2;
      spawnEnemyProjectile(
        world,
        enemy.x,
        enemy.y,
        angle,
        165,
        8 * waveDamageScale(world.wave),
        6,
        ENEMIES_BY_ID.overseer.accent,
      );
    }
    addEffect(world, 'ring', enemy.x, enemy.y, {
      radius: 44,
      life: 0.3,
      color: ENEMIES_BY_ID.overseer.accent,
    });
  }
}

function updateBoss(world: BattleWorld, boss: EnemyEntity, dt: number, rng: Rng): void {
  const def = ENEMIES_BY_ID.forgeCore;
  if (boss.mode === 'bossIntro') {
    boss.modeTimer -= dt;
    if (boss.modeTimer <= 0) {
      boss.mode = 'bossIdle';
      boss.invuln = 0;
      boss.abilityCooldown = 1.4;
    }
    return;
  }

  if (!boss.softEnrage && world.elapsed > BALANCE.bossSoftEnrageSeconds) {
    boss.softEnrage = true;
    addEffect(world, 'ring', boss.x, boss.y, {
      radius: 100,
      life: 0.6,
      color: '#FF5C5C',
    });
  }

  const speed =
    def.speed *
    (boss.phase === 2 ? 1 + BALANCE.bossPhase2SpeedPct : 1) *
    (boss.softEnrage ? 1 + BALANCE.bossSoftEnrageSpeedPct : 1);

  if (boss.mode === 'bossIdle') {
    const dx = world.player.x - boss.x;
    const dy = world.player.y - boss.y;
    const distance = Math.hypot(dx, dy) || 1;
    const nx = dx / distance;
    const ny = dy / distance;
    if (distance > 320) {
      moveEnemy(boss, nx, ny, speed, dt);
    } else if (distance < 210) {
      moveEnemy(boss, -nx, -ny, speed * 0.8, dt);
    } else {
      moveEnemy(boss, -ny, nx, speed * 0.35, dt);
    }

    boss.attackTimer -= dt;
    if (boss.attackTimer <= 0) {
      boss.attackTimer = 0.5;
    }
    boss.abilityCooldown -= dt;
    if (boss.abilityCooldown <= 0) {
      chooseBossAbility(world, boss, rng);
    }
    return;
  }

  if (boss.mode === 'bossTelegraph' && boss.ability === 'dash') {
    boss.modeTimer -= dt;
    if (boss.modeTimer <= 0) {
      const dx = boss.targetX - boss.x;
      const dy = boss.targetY - boss.y;
      const length = Math.hypot(dx, dy) || 1;
      boss.dirX = dx / length;
      boss.dirY = dy / length;
      boss.mode = 'bossDash';
      boss.modeTimer = 0.48;
      boss.burnTimer = 0;
      boss.dashCount += 1;
    }
    return;
  }

  if (boss.mode === 'bossDash') {
    moveEnemy(boss, boss.dirX, boss.dirY, 690, dt);
    boss.modeTimer -= dt;
    boss.burnTimer -= dt;
    if (boss.burnTimer <= 0) {
      boss.burnTimer = 0.12;
      addHazard(boss.x, boss.y, 34, 2, 8, world);
    }
    const hitWall = clampEnemy(boss);
    if (hitWall) {
      boss.mode = 'bossStun';
      boss.modeTimer = 1.2;
      boss.ability = null;
      addEffect(world, 'ring', boss.x, boss.y, {
        radius: 70,
        life: 0.4,
        color: '#FF5C5C',
      });
    } else if (boss.modeTimer <= 0) {
      if (boss.phase === 2 && boss.dashCount === 1) {
        boss.mode = 'bossTelegraph';
        boss.ability = 'dash';
        boss.modeTimer = 0.5;
        boss.targetX = world.player.x;
        boss.targetY = world.player.y;
      } else {
        boss.mode = 'bossStun';
        boss.modeTimer = 0.5;
        boss.ability = null;
        boss.abilityCooldown = nextBossCooldown(boss, rng);
      }
    }
    return;
  }

  if (boss.mode === 'bossStun') {
    boss.modeTimer -= dt;
    if (boss.modeTimer <= 0) {
      boss.mode = 'bossIdle';
      boss.dashCount = 0;
      if (boss.abilityCooldown <= 0) {
        boss.abilityCooldown = nextBossCooldown(boss, rng);
      }
    }
    return;
  }

  if (boss.mode === 'bossCharge' && boss.ability === 'barrage') {
    boss.modeTimer -= dt;
    if (boss.modeTimer <= 0) {
      fireBossBarrage(world, boss);
      boss.ability = null;
      boss.mode = 'bossIdle';
      boss.abilityCooldown = nextBossCooldown(boss, rng);
    }
    return;
  }

  if (boss.mode === 'bossSummon' && boss.ability === 'summon') {
    boss.modeTimer -= dt;
    if (boss.modeTimer <= 0) {
      summonBossDrones(world, boss, rng);
      boss.ability = null;
      boss.mode = 'bossIdle';
      boss.abilityCooldown = nextBossCooldown(boss, rng);
    }
  }
}

function chooseBossAbility(world: BattleWorld, boss: EnemyEntity, rng: Rng): void {
  const options: Array<'dash' | 'barrage' | 'summon'> =
    boss.phase === 2 ? ['dash', 'barrage'] : ['dash', 'barrage', 'summon'];
  const ability = options[rng.int(0, options.length - 1)];
  boss.ability = ability;
  boss.dashCount = 0;

  if (ability === 'dash') {
    boss.mode = 'bossTelegraph';
    boss.modeTimer = 0.9;
    boss.targetX = world.player.x;
    boss.targetY = world.player.y;
    addEffect(world, 'ring', boss.x, boss.y, {
      radius: 60,
      life: 0.35,
      color: '#FF5C5C',
    });
  } else if (ability === 'barrage') {
    boss.mode = 'bossCharge';
    boss.modeTimer = 0.8;
  } else {
    boss.mode = 'bossSummon';
    boss.modeTimer = 0.6;
  }
}

function nextBossCooldown(boss: EnemyEntity, rng: Rng): number {
  const base = 3.5 + rng.next();
  const phase = boss.phase === 2 ? 1 - BALANCE.bossPhase2AttackSpeedPct : 1;
  const enrage = boss.softEnrage ? 1 - BALANCE.bossSoftEnrageAttackSpeedPct : 1;
  return base * phase * enrage;
}

function fireBossBarrage(world: BattleWorld, boss: EnemyEntity): void {
  const count = boss.phase === 2 ? 32 : 16;
  for (let index = 0; index < count; index += 1) {
    const angle = (index / count) * TWO_PI + (boss.phase === 2 ? 0.12 : 0);
    spawnEnemyProjectile(
      world,
      boss.x,
      boss.y,
      angle,
      180,
      10 * waveDamageScale(world.wave),
      7,
      '#FF8F5C',
    );
  }
  addEffect(world, 'ring', boss.x, boss.y, {
    radius: boss.phase === 2 ? 118 : 86,
    life: 0.45,
    color: '#FF8F5C',
  });
}

function summonBossDrones(world: BattleWorld, boss: EnemyEntity, rng: Rng): void {
  for (let index = 0; index < 4; index += 1) {
    const angle = (index / 4) * TWO_PI + rng.next() * 0.4;
    const x = boss.x + Math.cos(angle) * 120;
    const y = boss.y + Math.sin(angle) * 120;
    addSpawnWarning(world, x, y, 'drone', 0.6);
  }
}

function addHazard(
  x: number,
  y: number,
  radius: number,
  life: number,
  damage: number,
  world: BattleWorld,
): void {
  const hazard: HazardEntity = {
    id: nextId(world),
    x,
    y,
    radius,
    life,
    tickTimer: 0.4,
    damage: damage * waveDamageScale(world.wave),
    dead: false,
  };
  world.hazards.push(hazard);
}

function waveDamageScale(wave: number): number {
  return 1 + BALANCE.enemyDamageGrowth * (wave - 1);
}

function updateSpawnWarnings(
  run: RunState,
  world: BattleWorld,
  wave: WaveDef,
  dt: number,
): void {
  for (const warning of world.spawnWarnings) {
    warning.timer -= dt;
    if (warning.timer > 0) continue;
    if (world.enemies.length >= BALANCE.enemyCap) {
      warning.timer = 0.3;
      continue;
    }
    const def = ENEMIES_BY_ID[warning.defId];
    spawnEnemy(world, wave.wave, def, warning.x, warning.y);
    warning.timer = 999;
  }
  world.spawnWarnings = world.spawnWarnings.filter((warning) => warning.timer < 999);
  void run;
}

function updateSpawner(
  run: RunState,
  world: BattleWorld,
  wave: WaveDef,
  dt: number,
  rng: Rng,
): void {
  if (wave.boss) return;

  if (world.enemies.length >= BALANCE.enemyCap) {
    world.spawnLocked = true;
  } else if (world.spawnLocked && world.enemies.length < BALANCE.enemyResumeThreshold) {
    world.spawnLocked = false;
  }

  for (let index = 0; index < world.eliteSchedule.length; index += 1) {
    if (world.elapsed < world.eliteSchedule[index]) continue;
    world.eliteSchedule.splice(index, 1);
    index -= 1;
    const point = randomSpawnPoint(world, rng);
    addSpawnWarning(world, point.x, point.y, 'overseer', BALANCE.spawnWarning);
  }

  if (world.spawnBudget <= 0) return;

  world.spawnTimer -= dt;
  if (world.spawnTimer > 0) return;

  if (world.spawnLocked || world.enemies.length + world.spawnWarnings.length >= BALANCE.enemyCap) {
    world.spawnTimer = 0.35;
    return;
  }

  const affordable = Object.entries(wave.spawnWeights)
    .map(([id, weight]) => {
      const def = ENEMIES_BY_ID[id as EnemyId];
      return { value: def, weight: weight ?? 0 };
    })
    .filter((entry) => entry.value.spawnCost > 0 && entry.value.spawnCost <= world.spawnBudget);
  if (affordable.length === 0) {
    world.spawnBudget = 0;
    return;
  }

  const def = rng.weightedPick(affordable);
  world.spawnBudget -= def.spawnCost;
  const point = randomSpawnPoint(world, rng);
  addSpawnWarning(world, point.x, point.y, def.id, BALANCE.spawnWarning);
  world.spawnTimer = world.elapsed < BALANCE.waveSpawnRampSeconds ? 1.5 : BALANCE.spawnInterval;
  void run;
}

function randomSpawnPoint(world: BattleWorld, rng: Rng): { x: number; y: number } {
  for (let attempt = 0; attempt < 24; attempt += 1) {
    const edge = rng.int(0, 3);
    let x = 60;
    let y = 60;
    if (edge === 0) {
      x = rng.next() * (WORLD_WIDTH - 160) + 80;
      y = 60;
    } else if (edge === 1) {
      x = WORLD_WIDTH - 60;
      y = rng.next() * (WORLD_HEIGHT - 160) + 80;
    } else if (edge === 2) {
      x = rng.next() * (WORLD_WIDTH - 160) + 80;
      y = WORLD_HEIGHT - 60;
    } else {
      x = 60;
      y = rng.next() * (WORLD_HEIGHT - 160) + 80;
    }
    if (Math.hypot(x - world.player.x, y - world.player.y) >= BALANCE.spawnMinDistance) {
      return { x, y };
    }
  }
  return { x: 80, y: 80 };
}

function addSpawnWarning(
  world: BattleWorld,
  x: number,
  y: number,
  defId: EnemyId,
  duration: number,
): void {
  const warning: SpawnWarning = {
    id: nextId(world),
    x,
    y,
    defId,
    timer: duration,
    maxTimer: duration,
    radius: ENEMIES_BY_ID[defId].radius + 16,
  };
  world.spawnWarnings.push(warning);
}

function spawnEnemy(
  world: BattleWorld,
  wave: number,
  def: EnemyDef,
  x: number,
  y: number,
): EnemyEntity {
  const hpScale = def.boss ? 1 : 1 + BALANCE.enemyHpGrowth * (wave - 1);
  const damageScale = def.boss ? 1 : 1 + BALANCE.enemyDamageGrowth * (wave - 1);
  const enemy: EnemyEntity = {
    id: nextId(world),
    defId: def.id,
    x,
    y,
    radius: def.radius,
    hp: def.hp * hpScale,
    maxHp: def.hp * hpScale,
    speed: def.speed,
    contactDamage: def.contactDamage * damageScale,
    coinValue: def.coin,
    mode: def.boss ? 'bossIntro' : 'chase',
    modeTimer: def.boss ? 1.5 : 0,
    attackTimer: def.boss ? 0 : 0.8 + (world.elapsed % 1.1),
    angle: 0,
    dirX: 0,
    dirY: 0,
    pushX: 0,
    pushY: 0,
    hitFlash: 0,
    elite: def.elite,
    boss: def.boss,
    phase: 1,
    invuln: def.boss ? 1.5 : 0,
    softEnrage: false,
    ability: null,
    abilityCooldown: def.boss ? 1.4 : 0,
    dashCount: 0,
    targetX: x,
    targetY: y,
    burnTimer: 0,
    dead: false,
  };
  world.enemies.push(enemy);
  if (def.boss) world.bossId = enemy.id;
  addEffect(world, 'spawn', x, y, {
    radius: def.radius + 26,
    life: 0.4,
    color: def.accent,
  });
  return enemy;
}

function updatePickups(
  run: RunState,
  world: BattleWorld,
  stats: PlayerStats,
  dt: number,
): void {
  for (const pickup of world.pickups) {
    if (pickup.dead) continue;
    const dx = world.player.x - pickup.x;
    const dy = world.player.y - pickup.y;
    const distance = Math.hypot(dx, dy) || 1;
    if (distance <= stats.pickupRadius) pickup.magnet = true;
    if (!pickup.magnet) continue;

    const nx = dx / distance;
    const ny = dy / distance;
    pickup.vx += nx * 1500 * dt;
    pickup.vy += ny * 1500 * dt;
    const speed = Math.hypot(pickup.vx, pickup.vy);
    const maxSpeed = 620;
    if (speed > maxSpeed) {
      pickup.vx = (pickup.vx / speed) * maxSpeed;
      pickup.vy = (pickup.vy / speed) * maxSpeed;
    }
    pickup.x += pickup.vx * dt;
    pickup.y += pickup.vy * dt;

    if (distance < world.player.radius + 10) {
      const awarded = Math.max(1, Math.round(pickup.value * (1 + stats.coinPct)));
      run.coins += awarded;
      run.totals.coinsEarned += awarded;
      world.waveStats.pickedCoins += awarded;
      pickup.dead = true;
      addEffect(world, 'ring', pickup.x, pickup.y, {
        radius: 12,
        life: 0.18,
        color: '#F5A524',
      });
    }
  }
}

function dropCoin(world: BattleWorld, x: number, y: number, value: number): void {
  if (world.pickups.length >= BALANCE.maxPickups) {
    const target = world.pickups[0];
    if (target) target.value += value;
    return;
  }
  const angle = (world.nextId * 2.399963229728653) % TWO_PI;
  const speed = 42;
  const pickup: PickupEntity = {
    id: nextId(world),
    x,
    y,
    value,
    radius: 5,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    magnet: false,
    dead: false,
  };
  world.pickups.push(pickup);
}

function updateHazards(
  run: RunState,
  world: BattleWorld,
  stats: PlayerStats,
  dt: number,
): void {
  for (const hazard of world.hazards) {
    if (hazard.dead) continue;
    hazard.life -= dt;
    if (hazard.life <= 0) {
      hazard.dead = true;
      continue;
    }
    hazard.tickTimer -= dt;
    if (hazard.tickTimer > 0) continue;
    hazard.tickTimer = 0.5;
    const distance = Math.hypot(hazard.x - world.player.x, hazard.y - world.player.y);
    if (distance <= hazard.radius + world.player.radius) {
      damagePlayer(world, run, hazard.damage, stats);
    }
  }
}

function resolveCollisions(
  run: RunState,
  world: BattleWorld,
  stats: PlayerStats,
  rng: Rng,
): void {
  for (const projectile of world.playerProjectiles) {
    if (projectile.dead) continue;
    for (const enemy of world.enemies) {
      if (enemy.dead || projectile.dead) continue;
      if (projectile.hitIds.has(enemy.id)) continue;
      const distance = Math.hypot(projectile.x - enemy.x, projectile.y - enemy.y);
      if (distance > projectile.radius + enemy.radius) continue;

      projectile.hitIds.add(enemy.id);
      const hit = damageEnemy(world, run, enemy, projectile.damage, {
        canBounce: true,
        source: 'direct',
        crit: projectile.crit,
      });
      if (hit) tryResetTrigger(run, world, projectile.attackId, rng);
      projectile.remainingPierce -= 1;
      if (projectile.remainingPierce <= 0) {
        projectile.dead = true;
        break;
      }
    }
  }

  for (const projectile of world.enemyProjectiles) {
    if (projectile.dead) continue;
    const distance = Math.hypot(
      projectile.x - world.player.x,
      projectile.y - world.player.y,
    );
    if (distance <= projectile.radius + world.player.radius) {
      projectile.dead = true;
      damagePlayer(world, run, projectile.damage, stats);
    }
  }

}

function resolveContactDamage(run: RunState, world: BattleWorld): void {
  if (world.player.iframes > 0) return;
  const stats = getBattleStats(run, world);
  for (const enemy of world.enemies) {
    if (enemy.dead || enemy.invuln > 0) continue;
    const distance = Math.hypot(enemy.x - world.player.x, enemy.y - world.player.y);
    if (distance <= enemy.radius + world.player.radius) {
      const raw =
        enemy.boss && enemy.mode === 'bossDash' ? 20 : enemy.contactDamage;
      damagePlayer(world, run, raw, stats);
      break;
    }
  }
}

export function damageEnemy(
  world: BattleWorld,
  run: RunState,
  enemy: EnemyEntity,
  amount: number,
  options: { canBounce: boolean; source: 'direct' | 'bounce' | 'dot'; crit?: boolean },
): boolean {
  if (enemy.dead || enemy.invuln > 0) return false;

  const hpBefore = enemy.hp;
  enemy.hp -= amount;
  enemy.hitFlash = 0.1;
  const actual = Math.max(0, Math.min(amount, hpBefore));
  run.totals.damage += actual;
  run.totals.bestHit = Math.max(run.totals.bestHit, actual);
  world.waveStats.damage += actual;
  addDamageText(world, enemy.x, enemy.y - enemy.radius, actual, options.crit ?? false);

  if (enemy.hp <= 0) {
    const overkill = Math.max(0, amount - hpBefore);
    killEnemy(world, run, enemy, overkill, options);
  } else if (
    enemy.boss &&
    enemy.phase === 1 &&
    enemy.hp <= enemy.maxHp * BALANCE.bossPhase2HpPct
  ) {
    enemy.phase = 2;
    enemy.invuln = 1;
    enemy.mode = 'bossIdle';
    enemy.ability = null;
    enemy.abilityCooldown = 1;
    enemy.dashCount = 0;
    addEffect(world, 'ring', enemy.x, enemy.y, {
      radius: 130,
      life: 0.8,
      color: '#FF5C5C',
    });
  }

  return true;
}

function killEnemy(
  world: BattleWorld,
  run: RunState,
  enemy: EnemyEntity,
  overkill: number,
  options: { canBounce: boolean; source: 'direct' | 'bounce' | 'dot' },
): void {
  enemy.dead = true;
  run.totals.kills += 1;
  world.waveStats.kills += 1;
  addEffect(world, 'kill', enemy.x, enemy.y, {
    radius: enemy.radius + (enemy.elite ? 24 : 10),
    life: 0.32,
    color: ENEMIES_BY_ID[enemy.defId].accent,
  });

  if (enemy.boss) {
    world.bossDefeated = true;
    world.victoryTimer = 1.8;
    world.bossId = null;
    run.coins += ENEMIES_BY_ID.forgeCore.coin;
    run.totals.coinsEarned += ENEMIES_BY_ID.forgeCore.coin;
    world.waveStats.pickedCoins += ENEMIES_BY_ID.forgeCore.coin;
    addEffect(world, 'kill', enemy.x, enemy.y, {
      radius: 220,
      life: 1.2,
      color: '#FFB020',
    });
    return;
  }

  dropCoin(world, enemy.x, enemy.y, enemy.coinValue);
  extendReset(world);

  if (
    run.characterId === 'simon' &&
    options.canBounce &&
    options.source === 'direct' &&
    overkill > 0
  ) {
    const target = findNearestEnemy(
      world,
      enemy.x,
      enemy.y,
      BALANCE.simonBounceRange,
      enemy.id,
    );
    if (target) {
      addEffect(world, 'bounce', enemy.x, enemy.y, {
        radius: BALANCE.simonBounceRange,
        life: 0.18,
        color: '#F5A524',
        angle: Math.atan2(target.y - enemy.y, target.x - enemy.x),
      });
      damageEnemy(world, run, target, overkill * BALANCE.simonBounceRatio, {
        canBounce: false,
        source: 'bounce',
      });
    }
  }
}

function damagePlayer(
  world: BattleWorld,
  run: RunState,
  rawDamage: number,
  stats: PlayerStats,
): void {
  if (world.player.iframes > 0 || world.player.hp <= 0) return;

  if (run.characterId === 'simon' && run.shields > 0) {
    run.shields -= 1;
    world.player.iframes = BALANCE.simonShieldIframes;
    addEffect(world, 'shieldBreak', world.player.x, world.player.y, {
      radius: 40,
      life: 0.35,
      color: '#F5A524',
    });
    return;
  }

  const damage = mitigateArmor(rawDamage, stats.armor);
  world.player.hp = Math.max(0, world.player.hp - damage);
  run.currentHp = world.player.hp;
  world.player.iframes = BALANCE.playerIframes;
  world.player.hitFlash = 0.12;
  addDamageText(world, world.player.x, world.player.y - 24, damage, false);
}

function findNearestEnemy(
  world: BattleWorld,
  x: number,
  y: number,
  range: number,
  excludeId?: number,
): EnemyEntity | null {
  let best: EnemyEntity | null = null;
  let bestDistance = range;
  for (const enemy of world.enemies) {
    if (enemy.dead || enemy.id === excludeId) continue;
    const distance = Math.hypot(enemy.x - x, enemy.y - y);
    if (
      distance < bestDistance ||
      (distance === bestDistance && best && enemy.hp < best.hp)
    ) {
      best = enemy;
      bestDistance = distance;
    }
  }
  return best;
}

function spawnEnemyProjectile(
  world: BattleWorld,
  x: number,
  y: number,
  angle: number,
  speed: number,
  damage: number,
  radius: number,
  color: string,
): void {
  if (world.enemyProjectiles.length >= BALANCE.maxEnemyProjectiles) return;
  const projectile: ProjectileEntity = {
    id: nextId(world),
    kind: 'enemy',
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    radius,
    damage,
    crit: false,
    remainingPierce: 1,
    hitIds: new Set<number>(),
    life: 4,
    maxLife: 4,
    weaponId: null,
    attackId: 0,
    color,
    returning: false,
    traveled: 0,
    maxDistance: 0,
    originX: x,
    originY: y,
    dead: false,
  };
  world.enemyProjectiles.push(projectile);
}

function moveEnemy(
  enemy: EnemyEntity,
  nx: number,
  ny: number,
  speed: number,
  dt: number,
): void {
  enemy.x += nx * speed * dt;
  enemy.y += ny * speed * dt;
}

function clampEnemy(enemy: EnemyEntity): boolean {
  const minX = BALANCE.margin + enemy.radius;
  const maxX = WORLD_WIDTH - BALANCE.margin - enemy.radius;
  const minY = BALANCE.margin + enemy.radius;
  const maxY = WORLD_HEIGHT - BALANCE.margin - enemy.radius;
  const beforeX = enemy.x;
  const beforeY = enemy.y;
  enemy.x = clamp(enemy.x, minX, maxX);
  enemy.y = clamp(enemy.y, minY, maxY);
  return beforeX !== enemy.x || beforeY !== enemy.y;
}

function separateEnemies(world: BattleWorld, dt: number): void {
  const enemies = world.enemies;
  for (let first = 0; first < enemies.length; first += 1) {
    const a = enemies[first];
    if (a.dead || a.boss) continue;
    for (let second = first + 1; second < enemies.length; second += 1) {
      const b = enemies[second];
      if (b.dead) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const minDistance = a.radius + b.radius;
      const distance = Math.hypot(dx, dy);
      if (distance >= minDistance || distance <= 0.001) continue;
      const push = ((minDistance - distance) / minDistance) * 26 * dt;
      const nx = dx / distance;
      const ny = dy / distance;
      if (!a.boss) {
        a.x -= nx * push;
        a.y -= ny * push;
      }
      if (!b.boss) {
        b.x += nx * push;
        b.y += ny * push;
      }
    }
  }
}

function updateVisuals(world: BattleWorld, dt: number): void {
  for (const effect of world.effects) {
    effect.life -= dt;
  }
  for (const text of world.damageTexts) {
    text.life -= dt;
    text.y -= 28 * dt;
  }
}

function cleanup(world: BattleWorld): void {
  world.enemies = world.enemies.filter((enemy) => !enemy.dead);
  world.playerProjectiles = world.playerProjectiles.filter(
    (projectile) => !projectile.dead,
  );
  world.enemyProjectiles = world.enemyProjectiles.filter(
    (projectile) => !projectile.dead,
  );
  world.pickups = world.pickups.filter((pickup) => !pickup.dead);
  world.hazards = world.hazards.filter((hazard) => !hazard.dead);
  world.effects = world.effects.filter((effect) => effect.life > 0);
  world.damageTexts = world.damageTexts.filter((text) => text.life > 0);
}

function addEffect(
  world: BattleWorld,
  kind: EffectKind,
  x: number,
  y: number,
  options: { radius: number; life: number; color: string; angle?: number },
): void {
  world.effects.push({
    id: nextId(world),
    kind,
    x,
    y,
    radius: options.radius,
    life: options.life,
    maxLife: options.life,
    color: options.color,
    angle: options.angle ?? 0,
  });
}

function addDamageText(
  world: BattleWorld,
  x: number,
  y: number,
  value: number,
  crit: boolean,
): void {
  const text: DamageText = {
    id: nextId(world),
    x,
    y,
    value: Math.max(1, Math.floor(value)),
    crit,
    life: 0.65,
    maxLife: 0.65,
  };
  world.damageTexts.push(text);
}

function nextId(world: BattleWorld): number {
  const id = world.nextId;
  world.nextId += 1;
  return id;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function normalizeAngle(angle: number): number {
  let normalized = angle;
  while (normalized > Math.PI) normalized -= TWO_PI;
  while (normalized < -Math.PI) normalized += TWO_PI;
  return normalized;
}

export function weaponName(id: WeaponId): string {
  return WEAPONS_BY_ID[id].name;
}
