/**
 * AnimalSpawner — пул и спавн перебегающих животных
 */
import * as THREE from 'three';
import { ANIMAL_TYPES } from './data.js';

const ANIMAL_KEYS = Object.keys(ANIMAL_TYPES);

function meshFactory(typeId) {
  const fn = (typeof window !== 'undefined' && window.createAnimalMesh) || (typeof createAnimalMesh === 'function' ? createAnimalMesh : null);
  if (!fn) throw new Error('createAnimalMesh не найден — задайте window.createAnimalMesh');
  return fn(typeId);
}

class AnimalSpawner {
    constructor(scene, roadWidth, roadCenter, finishZ, triggerLookahead, maxAnimals, spawnRate, crossMul, startZ) {
        this.scene = scene;
        this.roadWidth = roadWidth;
        this.roadCenter = roadCenter;
        this.finishZ = finishZ;
        this.triggerLookahead = triggerLookahead;
        this.animals = [];
        this.spawnTimer = 0;
        this.spawnRate = (typeof spawnRate === 'number' && spawnRate > 0) ? spawnRate : 1.5;
        this.minSpawnInterval = this.spawnRate * 0.75;
        this.maxSpawnInterval = this.spawnRate * 1.6;
        this.nextSpawnTime = this.getRandomInterval();
        this.totalSpawned = 0;
        this.maxAnimals = maxAnimals;
        this.crossMul = (typeof crossMul === 'number' && crossMul > 0) ? crossMul : 1.0;
        this.startZ = startZ;
        this.enabled = true;
        
        this.mandatoryPool = [];
        this.speciesCount = {};
        ANIMAL_KEYS.forEach(key => { this.speciesCount[key] = 0; });
        
        this.buildMandatoryPool();
        this.shufflePool();
    }

    buildMandatoryPool() {
        let allowed = (this.animalPool && this.animalPool.length)
            ? this.animalPool.slice()
            : ['DOG','CAT','DEER','BOAR','FOX','BEAR'];
        const prefer = {
            DOG: 4, HUMAN: 4, DEER: 3, BEAR: 3, CAT: 3, FOX: 3, BOAR: 3, CHICKEN: 2,
            CROC: 4, RHINO: 3, ELEPHANT: 3, DINO: 3, PEACOCK: 2,
            LION: 4, MONKEY: 3, GIRAFFE: 2, ZEBRA: 3, HIPPO: 3
        };
        this.mandatoryPool = [];
        const self = this;
        allowed.forEach(function(type) {
            const n = prefer[type] != null ? prefer[type] : 3;
            for (let i = 0; i < n; i++) self.mandatoryPool.push(type);
        });
        if (!this.mandatoryPool.length) this.mandatoryPool = ['DOG','CAT','DEER'];
    }

    shufflePool() {
        for (let i = this.mandatoryPool.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.mandatoryPool[i], this.mandatoryPool[j]] = [this.mandatoryPool[j], this.mandatoryPool[i]];
        }
    }

    getRandomInterval() {
        return Math.random() * (this.maxSpawnInterval - this.minSpawnInterval) + this.minSpawnInterval;
    }

    getNextSpecies() {
        if (this.mandatoryPool.length > 0) {
            return this.mandatoryPool.pop();
        }
        const pool = (this.animalPool && this.animalPool.length) ? this.animalPool : ANIMAL_KEYS;
        return pool[Math.floor(Math.random() * pool.length)];
    }

    acquireMesh(typeId) {
        if (!this.meshPool) this.meshPool = {};
        if (!this.meshPool[typeId]) this.meshPool[typeId] = [];
        let mesh = this.meshPool[typeId].pop();
        if (!mesh) {
            mesh = meshFactory(typeId);
            this.scene.add(mesh);
        }
        mesh.visible = false;
        return mesh;
    }

    releaseMesh(typeId, mesh) {
        if (!mesh) return;
        mesh.visible = false;
        mesh.position.set(0, -50, 0);
        if (!this.meshPool) this.meshPool = {};
        if (!this.meshPool[typeId]) this.meshPool[typeId] = [];
        if (this.meshPool[typeId].length < 12) this.meshPool[typeId].push(mesh);
        else {
            mesh.traverse(obj => {
                if (obj.geometry) obj.geometry.dispose();
                if (obj.material) {
                    if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
                    else obj.material.dispose();
                }
            });
            this.scene.remove(mesh);
        }
    }

    createAnimal(z, forcedType = null) {
        const typeId = forcedType || this.getNextSpecies();
        const type = ANIMAL_TYPES[typeId];
        const mesh = this.acquireMesh(typeId);

        const fromLeft = (typeof this._planFromLeft === 'boolean') ? this._planFromLeft : (Math.random() < 0.5);
        this._planFromLeft = undefined;
        const startX = fromLeft ? -(this.roadWidth / 2 + 1.5) : (this.roadWidth / 2 + 1.5);
        const endX = -startX;
        
        const scale = 0.85 + Math.random() * 0.45;
        mesh.scale.set(scale, scale, scale);
        mesh.rotation.y = fromLeft ? Math.PI / 2 : -Math.PI / 2;
        mesh.position.set(startX, 0, z);
        mesh.visible = false;

        // Ночные светящиеся глаза (яркие, у всех)
        mesh.traverse(obj => {
            if (obj.userData && obj.userData.isEye) {
                if (window.weatherMode === 'night') {
                    if (!obj.userData.dayMat) obj.userData.dayMat = obj.material;
                    if (!obj.userData.nightMat) {
                        obj.userData.nightMat = new THREE.MeshBasicMaterial({
                            color: 0x44ff66
                        });
                    }
                    obj.material = obj.userData.nightMat;
                    obj.scale.setScalar(1.6);
                } else {
                    if (obj.userData.dayMat) obj.material = obj.userData.dayMat;
                    obj.scale.setScalar(1.0);
                }
            }
        });

        return {
            type: 'animal',
            speciesKey: typeId,
            speciesId: type.id,
            animalType: typeId,
            mesh: mesh,
            z: z,
            x: startX,
            startX: startX,
            endX: endX,
            // Перебежка: зверь должен быть на полосе, когда подъезжает игрок
            // easy ~1.1–1.4с, medium ~0.9–1.2с, hard ~0.7–1.0с
            duration: (function() {
                // при близком старте — чуть дольше на полосе, чтобы можно было столкнуться
                const base = 1.15 + Math.random() * 0.3;
                const mul = Math.max(0.85, this.crossMul || 1.0);
                const sp = Math.max(0.9, Math.min(1.15, (type.speedCross || 4) / 4));
                return Math.max(0.75, Math.min(1.45, base / (mul * sp)));
            }.call(this)),
            elapsed: 0,
            triggered: false,
            aliveTime: 0,
            radius: type.radius * scale || 0.5,
            penalty: type.penalty || 0.35,
            timePenalty: type.timePenalty || 4,
            speedZ: type.speedZ || 0.02,
            speedCross: type.speedCross || 3.0,
            direction: fromLeft ? 1 : -1,
            hit: false
        };
    }

    update(deltaTime, playerZ) {
        if (!this.enabled || playerZ < this.finishZ) return;

        this.spawnTimer += deltaTime;
        const totalActive = this.animals.length;

        if (this.spawnTimer >= this.nextSpawnTime && totalActive < this.maxAnimals) {
            this.spawnTimer = 0;
            this.nextSpawnTime = this.getRandomInterval();

            // План из Web Worker (если готов) — меньше Math.random в кадре
            // Чуть дальше порога срабатывания — без «за горизонтом»
            let spawnZ = playerZ - (this.triggerLookahead + 6 + Math.random() * 8);
            const plan = window.__spawnPlan;
            if (plan && plan.length && this.totalSpawned < plan.length) {
                const item = plan[this.totalSpawned];
                if (item && typeof item.z === 'number') {
                    // z из плана, но не дальше чем «чуть впереди игрока»
                    spawnZ = Math.min(item.z, playerZ - 10);
                    this._planFromLeft = item.fromLeft;
                }
            }
            if (spawnZ > this.finishZ) {
                const typeId = this.getNextSpecies();
                const animal = this.createAnimal(spawnZ, typeId);
                this.animals.push(animal);
                this.totalSpawned++;
                this.speciesCount[typeId] = (this.speciesCount[typeId] || 0) + 1;
            }
        }

        for (let i = this.animals.length - 1; i >= 0; i--) {
            const animal = this.animals[i];
            this.updateAnimal(animal, deltaTime, playerZ);
            if (animal.triggered) animal.aliveTime += deltaTime;

            const staleTimeout = animal.aliveTime > 12;
            if (animal.z > playerZ + 30 || animal.hit || staleTimeout || animal.z < playerZ - 150) {
                this.disposeAnimal(animal);
                if (animal.speciesKey) {
                    this.speciesCount[animal.speciesKey] = Math.max(0, (this.speciesCount[animal.speciesKey] || 0) - 1);
                }
                this.animals.splice(i, 1);
            }
        }
    }

    updateAnimal(animal, deltaTime, playerZ) {
        if (!animal.triggered) {
            const distanceAhead = playerZ - animal.z;
            // Персональный порог: ±20% от lookahead — не все стартуют в одной точке
            if (animal._trigDist == null) {
                const base = this.triggerLookahead || 15;
                animal._trigDist = base * (0.9 + Math.random() * 0.2);
            }
            if (distanceAhead > 1.2 && distanceAhead <= animal._trigDist) {
                animal.triggered = true;
                animal.mesh.visible = true;
                try {
                    if (typeof this.startZ === 'number' && typeof this.finishZ === 'number') {
                        const prog = Math.min(1, Math.max(0, (this.startZ - playerZ) / (this.startZ - this.finishZ)));
                        // к финишу чуть резче, но без «уже убежали»
                        const late = 1 - prog * 0.08;
                        animal.duration = Math.max(0.7, animal.duration * late);
                    }
                } catch (e) {}
                if (typeof showAnimalShout === 'function') {
                    showAnimalShout(animal.typeId || animal.speciesKey || 'dog');
                }
            }
            if (distanceAhead < -5) {
                animal.hit = true;
            }
            return;
        }

        if (animal.elapsed < animal.duration) {
            animal.elapsed += deltaTime;
            const t = Math.min(animal.elapsed / animal.duration, 1);
            // ease-in-out + небольшой разгон в середине
            const easedT = t * t * (3 - 2 * t);
            animal.x = animal.startX + (animal.endX - animal.startX) * easedT;
            animal.mesh.position.x = animal.x;

            // --- анимация бега ---
            const stride = 1.0 - Math.abs(0.5 - t) * 0.35; // активнее в середине пути
            const cycle = animal.elapsed * (9 + (animal.speedCross || 3) * 1.2); // фаза
            // подпрыгивание корпуса
            const bob = Math.abs(Math.sin(cycle)) * 0.07 * stride;
            animal.mesh.position.y = bob;
            // лёгкий наклон в сторону бега
            const lean = Math.sin(cycle) * 0.08 * stride;
            const faceY = animal.direction > 0 ? Math.PI / 2 : -Math.PI / 2;
            animal.mesh.rotation.y = faceY;
            animal.mesh.rotation.z = lean * (animal.direction > 0 ? 1 : -1);
            animal.mesh.rotation.x = Math.sin(cycle * 0.5) * 0.04 * stride;

            // ноги: диагональная рысь (FL+BR / FR+BL)
            if (animal.mesh && animal.mesh.traverse) {
                animal.mesh.traverse(function(o) {
                    if (!o.userData) return;
                    if (o.userData.isLeg) {
                        const idx = o.userData.legIndex | 0;
                        const phase = (idx === 0 || idx === 3) ? 0 : Math.PI;
                        const swing = Math.sin(cycle + phase) * 0.55 * stride;
                        o.rotation.x = swing;
                        o.position.y = (o.userData.baseY || o.position.y) + Math.max(0, -Math.sin(cycle + phase)) * 0.03 * stride;
                    } else if (o.userData.isPaw) {
                        const idx = o.userData.legIndex | 0;
                        const phase = (idx === 0 || idx === 3) ? 0 : Math.PI;
                        const lift = Math.max(0, Math.sin(cycle + phase)) * 0.05 * stride;
                        if (o.userData.baseY != null) o.position.y = o.userData.baseY + lift;
                    }
                });
            }
        } else {
            // после перебежки — выровнять
            animal.mesh.position.y = 0;
            animal.mesh.rotation.x = 0;
            animal.mesh.rotation.z = 0;
            if (animal.direction !== undefined) {
                animal.mesh.rotation.y = animal.direction > 0 ? Math.PI / 2 : -Math.PI / 2;
            }
        }

        // Лёгкий дрейф по Z
        const zMove = (animal.speedZ || 0.02) * 0.12;
        animal.z -= zMove * 60 * deltaTime;
        animal.mesh.position.z = animal.z;
    }

    disposeAnimal(animal) {
        if (!animal || !animal.mesh) return;
        this.releaseMesh(animal.speciesKey, animal.mesh);
    }

    getActiveAnimals() {
        return this.animals.filter(a => a.triggered && !a.hit);
    }

    clear() {
        this.animals.forEach(a => this.disposeAnimal(a));
        this.animals = [];
        this.totalSpawned = 0;
        ANIMAL_KEYS.forEach(key => { this.speciesCount[key] = 0; });
        this.buildMandatoryPool();
        this.shufflePool();
    }

    getStats() {
        const species = {};
        ANIMAL_KEYS.forEach(key => {
            species[key] = this.speciesCount[key] || 0;
        });
        return {
            total: this.totalSpawned,
            active: this.animals.length,
            triggered: this.animals.filter(a => a.triggered && !a.hit).length,
            species: species,
            remainingInPool: this.mandatoryPool.length
        };
    }
}

export { AnimalSpawner };
export default AnimalSpawner;
