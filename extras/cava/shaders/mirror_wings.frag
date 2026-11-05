// Mirror wings (transparent background, premultiplied alpha)
//
// Thin glowing bars on both sides of the circle, at the circle's height.
// Mirrored twice: the right wing is the left wing flipped, and every bar
// grows up and down from the center line. The bass sits next to the circle.
// Each wing fades in from the screen edge and fades out just before the
// ring, so the circle takes over. Everything fades out when the music stops.
//
// The surface must be centered on the circle (cava-colors sets that up), so
// the circle is always at the middle of the surface. The fade distances below
// are in px and are tuned to prism_ring.frag at 480x480.
//
// Colors: gradient_colors[0..n-1] run left to right across the screen, picked
// from the wallpaper behind the wings by ~/.local/bin/cava-colors. The palette
// scrolls across with `color_phase` (faster when louder) and brightens on
// `beat` (both from cava-gl).

#version 330

in vec2 fragCoord;
out vec4 fragColor;

uniform float bars[256];

uniform int bars_count;
uniform int bar_width;
uniform int bar_spacing;

uniform vec3 u_resolution;
uniform vec3 fg_color;

uniform int gradient_count;
uniform vec3 gradient_colors[8];

uniform float color_phase;
uniform float beat;

const float INNER = 200.0;      // px from the circle's center where the wings start (fully faded)
const float INNER_FADE = 130.0; // px over which they fade in, moving away from the circle
const float EDGE_PAD = 12.0;    // px kept free at the screen edge
const float EDGE_FADE = 240.0;  // px over which they fade out toward the screen edge
const float V_ROOM = 10.0;      // px kept free above and below the tallest bar
const float GLOW_PX = 6.0;      // glow falloff distance
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
    vec2 px = fragCoord * res;
    vec2 center = res * 0.5;

    // Fold both mirrors: distance from the circle sideways, and from the center line.
    vec2 p = abs(px - center);

    float span0 = INNER;
    float span1 = center.x - EDGE_PAD;
    if (span1 <= span0 || p.x < span0 - 3.0 * GLOW_PX || p.x > span1 + 3.0 * GLOW_PX) {
        fragColor = vec4(0.0);
        return;
    }

    float fade = smoothstep(INNER, INNER + INNER_FADE, p.x) *
                 (1.0 - smoothstep(span1 - EDGE_FADE, span1, p.x));
    if (fade <= 0.0) {
        fragColor = vec4(0.0);
        return;
    }

    float slot = (span1 - span0) / float(bc);
    float fill = float(bar_width) / max(float(bar_width + bar_spacing), 1.0);
    float rad = max(slot * fill * 0.5, 0.75);
    float max_half = center.y - V_ROOM;

    int i0 = int(floor((p.x - span0) / slot));
    float solid = 0.0;
    float solid_tip = 0.0;
    float solid_amp = 0.0;
    float glow = 0.0;
    float near_on = 0.0;

    for (int k = -1; k <= 1; k++) {
        int i = i0 + k;
        if (i < 0 || i >= bc) {
            continue;
        }
        float v = clamp(bars[i], 0.0, 1.0);
        float amp = shape(v);
        float on = smoothstep(0.0, 0.02, v);
        near_on = max(near_on, on);

        float cx = span0 + (float(i) + 0.5) * slot;
        float half_h = max(amp * max_half, rad);
        float d = vcapsule(p, cx, -half_h, half_h, rad);

        float a = (1.0 - smoothstep(-0.7, 0.7, d)) * on;
        if (a > solid) {
            solid = a;
            solid_tip = smoothstep(half_h - 4.0 * rad, half_h, p.y);
            solid_amp = amp;
        }
        glow = max(glow, exp(-max(d, 0.0) / GLOW_PX) * (0.2 + 0.5 * amp) * on);
    }

    vec3 col = color_at(pingpong(px.x / res.x + FLOW * color_phase));
    col = min(mix(col, vec3(1.0), 0.18 * beat) * (1.0 + 0.2 * beat), vec3(1.0));

    float height_t = clamp(p.y / max_half, 0.0, 1.0);
    vec3 bar_col = col * (0.75 + 0.4 * height_t);
    bar_col = min(mix(bar_col, vec3(1.0), 0.25 * solid_tip * solid_amp), vec3(1.0));

    vec4 outc = vec4(col * glow, glow * 0.85);
    outc = over(vec4(bar_col * solid, solid), outc);

    // Faint center line, only where bars are moving.
    float line = exp(-p.y / 1.2) * 0.12 * near_on;
    outc = over(vec4(col * line, line), outc);

    outc *= fade;
    fragColor = vec4(min(outc.rgb, vec3(1.0)), clamp(outc.a, 0.0, 1.0));
}
