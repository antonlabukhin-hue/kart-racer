import * as THREE from 'three';

/**
 * ParticleSystem — пыль, искры, взрывы
 */
class ParticleSystem {
  constructor(scene) {
    this.scene = scene;
    this.maxParticles = 180;
    this.enabled = true;
    this.geometry = new THREE.BufferGeometry();
    this.aliveCount = 0;
        this.positions = new Float32Array(this.maxParticles * 3);
    this.sizes = new Float32Array(this.maxParticles);
    this.opacities = new Float32Array(this.maxParticles);
    this.colors = new Float32Array(this.maxParticles * 3);
    this.velocities = [];
    this.lifetimes = [];

    for (let i = 0; i < this.maxParticles; i++) {
        this.positions[i * 3] = 0;
        this.positions[i * 3 + 1] = 0;
        this.positions[i * 3 + 2] = 0;
        this.sizes[i] = 0;
        this.opacities[i] = 0;
        this.colors[i * 3] = 0.82; this.colors[i * 3 + 1] = 0.71; this.colors[i * 3 + 2] = 0.55;
        this.velocities.push({ x: 0, y: 0, z: 0 });
        this.lifetimes.push(0);
    }

    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));
    this.geometry.setAttribute('opacity', new THREE.BufferAttribute(this.opacities, 1));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));

    const material = new THREE.ShaderMaterial({
        uniforms: {},
        vertexShader: `
            precision mediump float;
            attribute float size;
            attribute float opacity;
            attribute vec3 color;
            varying float vOpacity;
            varying vec3 vColor;
            void main() {
                vOpacity = opacity;
                vColor = color;
                vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                gl_PointSize = size * (280.0 / max(-mvPosition.z, 0.01));
                gl_Position = projectionMatrix * mvPosition;
            }
        `,
        fragmentShader: `
            precision mediump float;
            varying float vOpacity;
            varying vec3 vColor;
            void main() {
                float d = length(gl_PointCoord - vec2(0.5));
                if (d > 0.5) discard;
                float alpha = smoothstep(0.5, 0.12, d) * vOpacity;
                gl_FragColor = vec4(vColor, alpha);
            }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });

    this.points = new THREE.Points(this.geometry, material);
    this.scene.add(this.points);
    this.particleIndex = 0;
}

emit(position, velocity, count = 2, customSize = 0.15) {
    if (!this.enabled || !position) return;
    velocity = velocity || { x: 0, y: 0.2, z: 0 };
    const density = quality === 'high' ? 2 : quality === 'medium' ? 1 : 0.5;
    const actualCount = Math.max(1, Math.floor(count * density));
    for (let i = 0; i < actualCount; i++) {
        const idx = this.particleIndex % this.maxParticles;
        this.particleIndex++;
        const i3 = idx * 3;
        const wasDead = this.opacities[idx] <= 0.01;

        this.positions[i3] = position.x + (Math.random() - 0.5) * 0.15;
        this.positions[i3 + 1] = position.y + 0.02;
        this.positions[i3 + 2] = position.z + (Math.random() - 0.5) * 0.1;

        this.sizes[idx] = customSize * (0.6 + Math.random() * 0.8);
        this.opacities[idx] = 0.4 + Math.random() * 0.3;
        this.colors[idx * 3] = 0.82; this.colors[idx * 3 + 1] = 0.71; this.colors[idx * 3 + 2] = 0.55;
        if (wasDead) this.aliveCount++;

        this.velocities[idx] = {
            x: velocity.x + (Math.random() - 0.5) * 0.4,
            y: Math.random() * 0.3 + 0.1,
            z: velocity.z + Math.random() * 0.5
        };
        this.lifetimes[idx] = 0.6 + Math.random() * 0.4;
    }
    try { if (this.geometry.attributes.color) this.geometry.attributes.color.needsUpdate = true; } catch (e) {}
}

explode(position, power) {
    if (!this.enabled || !position) return;
    const p = power != null ? power : 1;
    const dens = (typeof quality !== 'undefined' && quality === 'low') ? 0.45 : ((typeof quality !== 'undefined' && quality === 'medium') ? 0.7 : 1);
    const spawn = (count, sizeMin, sizeMax, lifeMin, lifeMax, speed, yBias, r, g, b, r2, g2, b2) => {
        const n = Math.max(2, Math.floor(count * dens));
        for (let i = 0; i < n; i++) {
            const idx = this.particleIndex % this.maxParticles;
            this.particleIndex++;
            const i3 = idx * 3;
            const wasDead = this.opacities[idx] <= 0.01;
            const ang = Math.random() * Math.PI * 2;
            const sp = speed * (0.35 + Math.random());
            this.positions[i3] = position.x + (Math.random() - 0.5) * 0.25 * p;
            this.positions[i3 + 1] = position.y + 0.08 + Math.random() * 0.15;
            this.positions[i3 + 2] = position.z + (Math.random() - 0.5) * 0.25 * p;
            this.sizes[idx] = sizeMin + Math.random() * (sizeMax - sizeMin);
            this.opacities[idx] = 0.8 + Math.random() * 0.2;
            const t = Math.random();
            this.colors[i3] = r + (r2 - r) * t;
            this.colors[i3 + 1] = g + (g2 - g) * t;
            this.colors[i3 + 2] = b + (b2 - b) * t;
            this.velocities[idx] = {
                x: Math.cos(ang) * sp,
                y: yBias + Math.random() * sp * 0.85,
                z: Math.sin(ang) * sp
            };
            this.lifetimes[idx] = lifeMin + Math.random() * (lifeMax - lifeMin);
            if (wasDead) this.aliveCount++;
        }
    };
    spawn(18 * p, 0.22 * p, 0.5 * p, 0.3, 0.65, 3.2 * p, 1.1, 1.0, 0.9, 0.25, 1.0, 0.3, 0.05);
    spawn(10 * p, 0.3 * p, 0.65 * p, 0.55, 1.0, 1.5 * p, 1.6, 0.4, 0.4, 0.42, 0.18, 0.18, 0.2);
    spawn(12 * p, 0.07, 0.16, 0.18, 0.4, 5.0 * p, 1.8, 1.0, 0.95, 0.45, 1.0, 0.55, 0.1);
    try {
        this.geometry.attributes.position.needsUpdate = true;
        this.geometry.attributes.size.needsUpdate = true;
        this.geometry.attributes.opacity.needsUpdate = true;
        if (this.geometry.attributes.color) this.geometry.attributes.color.needsUpdate = true;
    } catch (e) {}
}

update(deltaTime) {
    if (!this.enabled || this.aliveCount <= 0) return;
    for (let i = 0; i < this.maxParticles; i++) {
        const i3 = i * 3;
        if (this.opacities[i] > 0.01) {
            this.lifetimes[i] -= deltaTime;
            if (this.lifetimes[i] <= 0) {
                this.opacities[i] = 0;
                this.sizes[i] = 0;
                this.aliveCount = Math.max(0, this.aliveCount - 1);
                continue;
            }

            this.positions[i3] += this.velocities[i].x * deltaTime;
            this.positions[i3 + 1] += this.velocities[i].y * deltaTime;
            this.positions[i3 + 2] += this.velocities[i].z * deltaTime;

            this.velocities[i].x *= 0.95;
            this.velocities[i].z *= 0.95;
            this.velocities[i].y += -1.8 * deltaTime; // гравитация для взрывов

            const lifeRatio = this.lifetimes[i] / 1.0;
            this.opacities[i] = Math.max(0, lifeRatio * 0.5);
            this.sizes[i] *= 1.02;
        }
    }
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.size.needsUpdate = true;
    if (this.geometry.attributes.color) this.geometry.attributes.color.needsUpdate = true;
    this.geometry.attributes.opacity.needsUpdate = true;
}

dispose() {
    if (this.geometry) this.geometry.dispose();
    if (this.points && this.points.material) this.points.material.dispose();
    if (this.points) this.scene.remove(this.points);
}
            }

export { ParticleSystem };
export default ParticleSystem;
