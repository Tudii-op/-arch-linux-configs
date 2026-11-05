// Prism ring (transparent background, premultiplied alpha)
//
// - Spectrum ring: rounded glowing spikes, mirrored left/right so there is
//   no seam, spinning faster when the music is louder.
// - Contour rings inside: wavy "topographic" lines, each driven by its own
//   frequency band (inner = bass), drifting against the ring's rotation.
// - Core: a small glowing dot that pulses on bass; the whole thing kicks
//   slightly bigger on bass hits.
// Everything fades out when the music stops.
//
// Colors go around the ring: gradient_colors[i] is the color at screen
// angle i/n turns, counter-clockwise from 3 o'clock. ~/.local/bin/cava-colors
// fills them from the wallpaper behind the ring. The ring spins and the
// colors flow around it the other way, both faster when the music is louder
// (driven by `color_phase` from cava-gl), and colors brighten on `beat`.

#version 330

in vec2 fragCoord;
out vec4 fragColor;

uniform float bars[512];

uniform int bars_count;
uniform int bar_width;
uniform int bar_spacing;

uniform vec3 u_resolution;
uniform vec3 fg_color;

uniform int gradient_count;
uniform vec3 gradient_colors[8];

uniform float shader_time;
uniform float color_phase;
uniform float beat;

const float PI = 3.14159265;
const float TAU = 6.28318531;

const float BASE_R = 0.285;    // where the spikes start (share of the surface height)
const float MAX_LEN = 0.12;    // longest spike
const float SPIN = 0.8;        // ring rotation per radian of color_phase (~12-50 s per turn)
const float KICK = 0.045;      // how much bass scales the whole thing up
const float GLOW_PX = 9.0;     // glow falloff distance
const int RINGS = 5;           // contour rings inside the spectrum ring
const float FLOW = 0.1;        // color flow per radian of color_phase (turns, against the spin)

vec3 ring_color(float a) {
    if (gradient_count <= 0) {
        return fg_color;
    }
    if (gradient_count == 1) {
        return gradient_colors[0];
    }
    float c = fract(a) * float(gradient_count);
    int i = clamp(int(floor(c)), 0, gradient_count - 1);
    int j = (i + 1 == gradient_count) ? 0 : i + 1;
    return mix(gradient_colors[i], gradient_colors[j], smoothstep(0.0, 1.0, c - float(i)));
}

// Wallpaper color at angle a, flowed counter-clockwise and lit up on beats.
// (The spin, theta + rot, turns the spikes clockwise; a - flow turns colors the
// other way.)
vec3 moving_color(float a, float flow) {
    vec3 c = ring_color(a - flow);
    return min(mix(c, vec3(1.0), 0.18 * beat) * (1.0 + 0.2 * beat), vec3(1.0));
}

float shape(float v) {
    v = clamp(v, 0.0, 1.0);
    return v * (1.0 + 0.8 * (1.0 - v));
}

float band(int from, int to, int bc) {
    from = clamp(from, 0, bc - 1);
    to = clamp(to, from + 1, bc);
    float sum = 0.0;
    for (int i = from; i < to; i++) {
        sum += clamp(bars[i], 0.0, 1.0);
    }
    return sum / float(to - from);
}

// Mirrors a bar index past either end back into range (the spectrum is
// drawn twice, once per side, meeting at the top and bottom).
int mirror_index(int i, int bc) {
    if (i < 0) {
        i = -i - 1;
    }
    if (i >= bc) {
        i = 2 * bc - i - 1;
    }
    return clamp(i, 0, bc - 1);
}

vec4 over(vec4 top, vec4 bottom) {
    return top + bottom * (1.0 - top.a);
}

void main() {
    int bc = min(bars_count, 512);
    if (bc <= 0) {
        fragColor = vec4(0.0);
        return;
    }

    vec2 p = fragCoord - vec2(0.5);
    p.x *= u_resolution.x / u_resolution.y;
    float px = 1.0 / u_resolution.y;   // one pixel, in the same units as p

    float energy = band(0, bc, bc);
    float act = smoothstep(0.0, 0.03, energy);
    if (act <= 0.0) {
        fragColor = vec4(0.0);
        return;
    }
    float bass = shape(band(0, max(bc / 8, 1), bc));

    p /= 1.0 + KICK * bass;
    float r = length(p);
    if (r > BASE_R + MAX_LEN + 0.1) {
        fragColor = vec4(0.0);
        return;
    }

    float theta = atan(p.y, p.x);
    float a_screen = fract(theta / TAU);
    float t_now = shader_time;
    float rot = color_phase * SPIN;

    float flow = FLOW * color_phase;   // colors go counter-clockwise, the spin goes clockwise
    vec4 outc = vec4(0.0);

    // --- Core: glowing dot that pulses on bass ---
    vec3 core_col = min(mix(moving_color(a_screen + 0.25 * sin(t_now * 0.2), flow), vec3(1.0), 0.35),
                        vec3(1.0));
    float core_r = 0.022 + 0.03 * bass;
    float core = 1.0 - smoothstep(core_r - px, core_r + px, r);
    float core_halo = exp(-max(r - core_r, 0.0) / 0.03) * 0.55 * bass;
    outc = over(vec4(core_col * core_halo, core_halo * 0.8), outc);
    outc = over(vec4(core_col * core * 0.9, core * 0.9), outc);

    // --- Contour rings: wavy lines, one frequency band each ---
    int low_bars = max(int(float(bc) * 0.6), RINGS);
    for (int k = 0; k < RINGS; k++) {
        float fk = float(k);
        float e = shape(band(k * low_bars / RINGS, (k + 1) * low_bars / RINGS, bc));

        float phi = theta - rot * 1.7 + fk * 0.9;
        float wobble = 0.55 * sin(3.0 * phi + t_now * 0.8 + fk * 1.3) +
                       0.30 * sin(5.0 * phi - t_now * 1.15 + fk * 2.1) +
                       0.15 * sin(8.0 * phi + t_now * 0.5 + fk * 0.7);
        float rk = 0.075 + fk * 0.038 + 0.01 * bass + (0.004 + 0.032 * e) * wobble;

        float d_px = abs(r - rk) / px;
        float half_w = 0.6 + 0.9 * e;
        float line = 1.0 - smoothstep(half_w - 0.7, half_w + 0.7, d_px);
        float halo = exp(-d_px / 5.0) * 0.3;
        float a = (line + halo * (1.0 - line)) * (0.25 + 0.75 * e);

        vec3 c = moving_color(a_screen + fk * 0.07, flow);
        c = min(c * (0.85 + 0.3 * e), vec3(1.0));
        outc = over(vec4(c * a, a), outc);
    }

    // --- Spectrum ring: mirrored, rotating, rounded glowing spikes ---
    // Angle from the top of the rotated ring, folded so both sides show the
    // same spectrum: 0 at the top, 1 at the bottom.
    float w = fract((theta + rot - 0.5 * PI) / TAU + 0.5) - 0.5;
    float cell = abs(w) * 2.0 * float(bc);
    int i0 = int(floor(cell));
    float f = fract(cell);

    float fill = float(bar_width) / max(float(bar_width + bar_spacing), 1.0);
    float cell_angle = PI / float(bc);
    float hw = max(0.5 * fill * cell_angle * BASE_R, px);

    float solid = 0.0;
    float solid_tip = 0.0;
    float solid_amp = 0.0;
    float glow = 0.0;
    for (int k = -1; k <= 1; k++) {
        int i = mirror_index(i0 + k, bc);
        float v = clamp(bars[i], 0.0, 1.0);
        float amp = shape(v);
        float on = smoothstep(0.0, 0.02, v);
        float len = max(amp * MAX_LEN, 2.0 * hw);

        float u = (f - 0.5 - float(k)) * cell_angle * r;   // arc distance to this spike's center
        float rr = clamp(r, BASE_R + hw, BASE_R + max(len - hw, hw));
        float d = length(vec2(u, r - rr)) - hw;
        float d_px = d / px;

        float s = (1.0 - smoothstep(-0.8, 0.8, d_px)) * on;
        if (s > solid) {
            solid = s;
            solid_tip = smoothstep(BASE_R, BASE_R + len, r);
            solid_amp = amp;
        }
        glow = max(glow, exp(-max(d_px, 0.0) / GLOW_PX) * (0.22 + 0.6 * amp) * on);
    }

    vec3 col = moving_color(a_screen, flow);
    vec3 spike_col = col * (0.75 + 0.45 * solid_tip);
    spike_col = min(mix(spike_col, vec3(1.0), 0.25 * solid_tip * solid_amp), vec3(1.0));

    outc = over(vec4(col * glow, glow * 0.85), outc);
    outc = over(vec4(spike_col * solid, solid), outc);

    outc *= act;
    fragColor = vec4(min(outc.rgb, vec3(1.0)), clamp(outc.a, 0.0, 1.0));
}
