import type {
  Player,
  UpgradeOption,
  WeaponConfig,
  PassiveUpgrade,
} from "./types";
import { shuffle } from "./utils";
import { WeaponSystem } from "./weaponSystem";
import weaponsConfig from "./config/weapons.json";
import upgradesConfig from "./config/upgrades.json";

const weapons = weaponsConfig as unknown as Record<string, WeaponConfig>;
const upgrades = upgradesConfig as {
  passives: PassiveUpgrade[];
  weapons: string[];
};

const evolutionRecipes: Array<{
  ingredients: Array<{ id: string; type: "weapon" | "passive" }>;
  result: string;
}> = [
  {
    ingredients: [
      { id: "basicGun", type: "weapon" },
      { id: "ringShot", type: "weapon" },
    ],
    result: "bulletStorm",
  },
  {
    ingredients: [
      { id: "orbitingBall", type: "weapon" },
      { id: "spike", type: "weapon" },
    ],
    result: "gravityCollapse",
  },
  {
    ingredients: [
      { id: "lightningChain", type: "weapon" },
      { id: "damageBonus", type: "passive" },
    ],
    result: "thunderstorm",
  },
];

export class UpgradeSystem {
  private weaponSystem: WeaponSystem;

  constructor(weaponSystem: WeaponSystem) {
    this.weaponSystem = weaponSystem;
  }

  private checkEvolutionReady(player: Player): UpgradeOption[] {
    const evolutionOptions: UpgradeOption[] = [];
    const evolvedWeapons = player.weapons.filter(
      (w) => weapons[w.configId]?.isEvolution,
    );
    const evolvedIds = new Set(evolvedWeapons.map((w) => w.configId));

    for (const recipe of evolutionRecipes) {
      if (evolvedIds.has(recipe.result)) continue;

      let allMaxed = true;
      const ingredientNames: string[] = [];

      for (const ingredient of recipe.ingredients) {
        if (ingredient.type === "weapon") {
          const weapon = player.weapons.find(
            (w) => w.configId === ingredient.id,
          );
          const config = weapons[ingredient.id];
          if (!weapon || weapon.level < config.maxLevel) {
            allMaxed = false;
            break;
          }
          ingredientNames.push(config.name);
        } else {
          const passive = upgrades.passives.find((p) => p.id === ingredient.id);
          const level = player.passiveLevels[ingredient.id] || 0;
          if (!passive || level < passive.maxLevel) {
            allMaxed = false;
            break;
          }
          ingredientNames.push(passive.name);
        }
      }

      if (allMaxed) {
        const resultConfig = weapons[recipe.result];
        evolutionOptions.push({
          id: `evolution_${recipe.result}`,
          name: `进化: ${resultConfig.name}`,
          description: `${ingredientNames.join(" + ")} → ${resultConfig.description}`,
          type: "evolution",
          level: 1,
          maxLevel: 1,
          isNew: true,
          isEvolution: true,
          evolvesFrom: recipe.ingredients.map((i) => i.id),
          evolvesTo: recipe.result,
        });
      }
    }

    return evolutionOptions;
  }

  generateUpgradeOptions(player: Player): UpgradeOption[] {
    const options: UpgradeOption[] = [];
    const availableOptions: UpgradeOption[] = [];

    const evolutionOptions = this.checkEvolutionReady(player);
    if (evolutionOptions.length > 0) {
      options.push(...evolutionOptions);
    }

    const activeEvolutionWeaponIds = new Set(
      player.weapons
        .filter((w) => weapons[w.configId]?.isEvolution)
        .map((w) => w.configId),
    );

    const usedIngredientIds = new Set<string>();
    for (const recipe of evolutionRecipes) {
      if (activeEvolutionWeaponIds.has(recipe.result)) {
        for (const ing of recipe.ingredients) {
          usedIngredientIds.add(ing.id);
        }
      }
    }

    for (const weaponId of upgrades.weapons) {
      if (usedIngredientIds.has(weaponId)) continue;

      const weaponConfig = weapons[weaponId];
      if (!weaponConfig || weaponConfig.isEvolution) continue;

      const existingWeapon = player.weapons.find(
        (w) => w.configId === weaponId,
      );

      if (existingWeapon) {
        if (existingWeapon.level < weaponConfig.maxLevel) {
          availableOptions.push({
            id: weaponId,
            name: weaponConfig.name,
            description: `升级到 Lv.${existingWeapon.level + 1}`,
            type: "weapon",
            level: existingWeapon.level,
            maxLevel: weaponConfig.maxLevel,
            isNew: false,
          });
        }
      } else if (player.weapons.length < 6) {
        availableOptions.push({
          id: weaponId,
          name: weaponConfig.name,
          description: weaponConfig.description,
          type: "weapon",
          level: 0,
          maxLevel: weaponConfig.maxLevel,
          isNew: true,
        });
      }
    }

    for (const passive of upgrades.passives) {
      if (usedIngredientIds.has(passive.id)) continue;

      const currentLevel = player.passiveLevels[passive.id] || 0;
      if (currentLevel < passive.maxLevel) {
        availableOptions.push({
          id: passive.id,
          name: passive.name,
          description: passive.description,
          type: "passive",
          level: currentLevel,
          maxLevel: passive.maxLevel,
          isNew: currentLevel === 0,
        });
      }
    }

    const shuffled = shuffle(availableOptions);
    const remainingSlots = Math.max(0, 3 - options.length);
    for (let i = 0; i < Math.min(remainingSlots, shuffled.length); i++) {
      options.push(shuffled[i]);
    }

    return options;
  }

  applyUpgrade(player: Player, option: UpgradeOption): void {
    if (option.type === "evolution" && option.evolvesTo && option.evolvesFrom) {
      this.applyEvolution(player, option.evolvesTo, option.evolvesFrom);
      return;
    }

    if (option.type === "weapon") {
      if (option.isNew) {
        const newWeapon = this.weaponSystem.addNewWeapon(option.id);
        if (newWeapon) {
          player.weapons.push(newWeapon);
        }
      } else {
        const weapon = player.weapons.find((w) => w.configId === option.id);
        if (weapon) {
          this.weaponSystem.upgradeWeapon(weapon);
        }
      }
    } else if (option.type === "passive") {
      this.applyPassive(player, option.id);
    }
  }

  private applyEvolution(
    player: Player,
    resultId: string,
    ingredientIds: string[],
  ): void {
    const weaponIngredients = ingredientIds.filter((id) =>
      upgrades.weapons.includes(id),
    );
    const passiveIngredients = ingredientIds.filter((id) =>
      upgrades.passives.some((p) => p.id === id),
    );

    for (const weaponId of weaponIngredients) {
      const idx = player.weapons.findIndex((w) => w.configId === weaponId);
      if (idx !== -1) {
        this.weaponSystem.removeWeapon(weaponId);
        player.weapons.splice(idx, 1);
      }
    }

    for (const passiveId of passiveIngredients) {
      const passive = upgrades.passives.find((p) => p.id === passiveId);
      const level = player.passiveLevels[passiveId] || 0;
      if (passive && level > 0) {
        this.revertPassive(player, passive, level);
        delete player.passiveLevels[passiveId];
      }
    }

    const evolvedWeapon = this.weaponSystem.addNewWeapon(resultId);
    if (evolvedWeapon) {
      player.weapons.push(evolvedWeapon);
    }
  }

  private revertPassive(
    player: Player,
    passive: PassiveUpgrade,
    _level: number,
  ): void {
    switch (passive.effect) {
      case "moveSpeed":
        player.moveSpeed = player.baseMoveSpeed;
        break;
      case "maxHealth":
        player.maxHealth = 100;
        player.health = Math.min(player.health, player.maxHealth);
        break;
      case "pickupRange":
        player.pickupRange = player.basePickupRange;
        break;
      case "healRate":
        player.healRate = 0.5;
        break;
      case "damageBonus":
        player.damageBonus = 0;
        break;
      case "cooldownReduction":
        player.cooldownReduction = 0;
        break;
    }
  }

  private applyPassive(player: Player, passiveId: string): void {
    const passive = upgrades.passives.find((p) => p.id === passiveId);
    if (!passive) return;

    const currentLevel = player.passiveLevels[passiveId] || 0;
    const newLevel = currentLevel + 1;
    player.passiveLevels[passiveId] = newLevel;

    switch (passive.effect) {
      case "moveSpeed":
        player.moveSpeed =
          player.baseMoveSpeed * (1 + passive.value * newLevel);
        break;
      case "maxHealth":
        player.maxHealth = 100 + passive.value * newLevel;
        player.health = Math.min(
          player.health + passive.value,
          player.maxHealth,
        );
        break;
      case "pickupRange":
        player.pickupRange = player.basePickupRange + passive.value * newLevel;
        break;
      case "healRate":
        player.healRate = 0.5 + passive.value * newLevel;
        break;
      case "damageBonus":
        player.damageBonus = passive.value * newLevel;
        break;
      case "cooldownReduction":
        player.cooldownReduction = Math.min(0.5, passive.value * newLevel);
        break;
    }
  }

  checkLevelUp(player: Player): boolean {
    return player.exp >= player.expToNext;
  }

  processLevelUp(player: Player): void {
    player.exp -= player.expToNext;
    player.level++;
    player.expToNext = Math.floor(
      20 + player.level * 10 + Math.pow(player.level, 1.5),
    );
  }
}
