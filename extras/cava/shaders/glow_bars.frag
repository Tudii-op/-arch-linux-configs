// Glow bars (transparent background, premultiplied alpha)
//
// Rounded bars rising from the bottom edge of the surface, a soft glow
// around each bar, and peak caps that hold for a moment and then fall (the
// `peaks` uniform comes from cava-gl; with a stock cava it stays zero and
// the caps just don't show). Caps fade out when they float far above their bar.
//
// Colors: gradient_colors[0..n-1] run left to right across the surface.
// ~/.local/bin/cava-colors fills them from the wallpaper pixels behind the
// bars, so at rest each part of the visualizer matches what is behind it.
// The palette scrolls across with `color_phase` (faster when louder) and
// brightens on `beat`; both come from cava-gl and stay zero with a stock cava.

#version 330

in vec2 fragCoord;
out vec4 fragColor;

uniform float bars[256];   // 256 is plenty here; bars[512] + peaks[512] is too many uniforms for some drivers
uniform float peaks[256];

uniform int bars_count;
uniform int bar_width;
uniform int bar_spacing;

uniform vec3 u_resolution;
uniform vec3 fg_color;

uniform int gradient_count;
uniform vec3 gradient_colors[8];

uniform float color_phase;
uniform float beat;

const float TOP_ROOM = 18.0;   // px kept free above the tallest bar for its cap and glow
const float GLOW_PX = 9.0;     // glow falloff distance
const float CAP_GAP = 4.0;     // px between a bar's top and its peak cap
const float CAP_HALF = 1.5;    // half thickness of a peak cap
const float FLOW = 0.1;        // color scroll per radian of color_phase (screen widths)

vec3 color_at(float x) {
    if (gradient_count <= 0) {
        return fg_color;
    }
    if (gradient_count == 1) {
        return gradient_colors[0];
    }
    float c = clamp(x, 0.0, 1.0) * float(gradient_count - 1);
    int i = clamp(int(floor(c)), 0, gradient_count - 2);
    return mix(gradient_colors[i], gradient_colors[i + 1], smoothstep(0.0, 1.0, c - float(i)));
}

// Lifts quiet bars so small values still read, without changing loud ones much.
// 0 -> 1 -> 0 -> 1 ... so a left-to-right palette can scroll forever with no seam.
float pingpong(float u) {
    return 1.0 - abs(1.0 - 2.0 * fract(u * 0.5));
}

float shape(float v) {
    v = clamp(v, 0.0, 1.0);
    return v * (1.0 + 0.6 * (1.0 - v));
}

// Signed distance (px) to a vertical capsule at x = cx from y0 up to y1.
float vcapsule(vec2 p, float cx, float y0, float y1, float rad) {
    float y = clamp(p.y, y0 + rad, max(y1 - rad, y0 + rad));
    return length(vec2(p.x - cx, p.y - y)) - rad;
}

// Signed distance (px) to a horizontal pill centered at c.
float hpill(vec2 p, vec2 c, float half_len, float half_thick) {
    vec2 q = abs(p - c) - vec2(max(half_len - half_thick, 0.0), 0.0);
    return length(max(q, 0.0)) - half_thick;
}

vec4 over(vec4 top, vec4 bottom) {
    return top + bottom * (1.0 - top.a);
}

void main() {
    int bc = min(bars_count, 256);
    if (bc <= 0) {
        fragColor = vec4(0.0);
        return;
    }

    vec2 res = u_resolution.xy;
    vec2 p = fragCoord * res;

    float max_h = res.y - TOP_ROOM;
    float slot = res.x / float(bc);
    float fill = float(bar_width) / max(float(bar_width + bar_spacing), 1.0);
    float rad = max(slot * fill * 0.5, 1.0);

    vec3 col = color_at(pingpong(p.x / res.x + FLOW * color_phase));
    col = min(mix(col, vec3(1.0), 0.18 * beat) * (1.0 + 0.2 * beat), vec3(1.0));

    int i0 = int(floor(p.x / slot));
    float solid = 0.0;
    float solid_tip = 0.0;
    float solid_amp = 0.0;
    float glow = 0.0;
    float cap = 0.0;

    for (int k = -2; k <= 2; k++) {
        int i = i0 + k;
        if (i < 0 || i >= bc) {
            continue;
        }
        float v = clamp(bars[i], 0.0, 1.0);
        float amp = shape(v);
        float on = smoothstep(0.0, 0.02, v);

        // Bars start below the edge so the screen cuts their bottoms flat.
        float cx = (float(i) + 0.5) * slot;
        float y0 = -rad;
        float y1 = max(amp * max_h, rad);

        float d = vcapsule(p, cx, y0, y1, rad);
        float a = (1.0 - smoothstep(-0.8, 0.8, d)) * on;
        if (a > solid) {
            solid = a;
            solid_tip = smoothstep(y1 - 4.0 * rad, y1, p.y);
            solid_amp = amp;
        }
        glow = max(glow, exp(-max(d, 0.0) / GLOW_PX) * (0.22 + 0.55 * amp) * on);

        float pk = clamp(peaks[i], 0.0, 1.0);
        if (pk > 0.015) {
            float cap_y = max(shape(pk) * max_h, rad) + CAP_GAP + CAP_HALF;
            float dc = hpill(p, vec2(cx, cap_y), rad, CAP_HALF);
            // Caps fade out the further they float above their bar.
            float drift = shape(pk) - amp;
            cap = max(cap, (1.0 - smoothstep(-0.7, 0.7, dc)) * smoothstep(0.015, 0.05, pk) *
                               (1.0 - smoothstep(0.08, 0.35, drift)));
        }
    }

    // Bars get brighter toward the tip, and loud bars get a hot white tip.
    float height_t = clamp(p.y / max_h, 0.0, 1.0);
    vec3 bar_col = col * (0.72 + 0.45 * height_t);
    bar_col = mix(bar_col, vec3(1.0), 0.28 * solid_tip * solid_amp);
    bar_col = min(bar_col, vec3(1.0));
    vec3 cap_col = min(mix(col, vec3(1.0), 0.55), vec3(1.0));

    // Back to front: glow, bar, cap (all premultiplied).
    vec4 outc = vec4(col * glow, glow * 0.85);
    outc = over(vec4(bar_col * solid, solid), outc);
    outc = over(vec4(cap_col * cap * 0.8, cap * 0.8), outc);

    fragColor = vec4(min(outc.rgb, vec3(1.0)), clamp(outc.a, 0.0, 1.0));
}
