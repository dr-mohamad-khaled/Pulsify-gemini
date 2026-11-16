package app.pulsify.engine

import android.content.Context
import android.opengl.GLES20
import java.nio.ByteBuffer
import java.nio.ByteOrder
import kotlin.math.abs
import kotlin.math.cos
import kotlin.math.exp
import kotlin.math.hypot
import kotlin.math.max
import kotlin.math.min
import kotlin.math.sign
import kotlin.math.sin
import kotlin.random.Random

/**
 * Cosmo, falling forever through space. Stars and dust rush up past him, a planet or a comet drifts by
 * now and then, and he tumbles slowly the whole time.
 *  - Tap / touch: he falls HARDER: the stars streak, he flails and spins faster, then calms down again.
 *  - Swipe across him: he's flung sideways and drifts off to the next home-screen page (he lives in
 *    page space, so swiping your pages brings you to wherever he floated).
 *  - Left alone he waves, curls into a ball and somersaults, tries to swim, gives a thumbs up,
 *    or just leans back and enjoys the fall.
 */
class AstroScene(private val context: Context) : Creature {
    override var listener: SceneListener? = null
    override var bottomInset = 0f
    override val busy: Boolean get() = true

    private val pet = Pet3D(context)
    private var prog = 0; private var vbo = 0
    private val su = HashMap<String, Int>()
    private var w = 1; private var h = 1
    private val halfW get() = 0.5f * w / min(w, h)
    private val halfH get() = 0.5f * h / min(w, h)

    // where he is: x in page units (0 = first page centre), y in screen uv
    private var px = 0.5f; private var vx = 0f
    private var y = 0f; private var vy = 0f
    private var pagePos = 0f
    private var pagesKnown = false
    private var speed = 1f; private var fall = 0f
    private var spin = 0f; private var spinRate = 0.35f
    private var yawPh = 0f; private var shake = 0f
    private var time = 0f
    private var cur: PetClip? = null; private var curT = 0f
    private var from: PetClip? = null; private var fromT = 0f; private var fade = 1f
    private val matA = FloatArray(Pet3D.MAX_BONES * 12); private val matB = FloatArray(Pet3D.MAX_BONES * 12)
    private val ctl = FloatArray(Pet3D.MAX_CTL)
    private var nextLife = 4f
    private var down = false; private var dx = 0f; private var dy = 0f; private var lx = 0f; private var ly = 0f; private var downT = 0f
    private var flung = false
    private var lastMoveT = 0f; private var mvx = 0f; private var mvy = 0f

    override fun onSurfaceCreated() {
        pet.create(); pet.load("astro"); cur = null
        prog = Gl.program(VERT, FRAG)
        for (n in listOf("uRes", "uHalf", "uFall", "uSpeed", "uTime", "uPar", "uShake")) su[n] = GLES20.glGetUniformLocation(prog, n)
        val ids = IntArray(1); GLES20.glGenBuffers(1, ids, 0); vbo = ids[0]
        val tri = floatArrayOf(-1f, -1f, 3f, -1f, -1f, 3f)
        val fb = ByteBuffer.allocateDirect(tri.size * 4).order(ByteOrder.nativeOrder()).asFloatBuffer().put(tri); fb.position(0)
        GLES20.glBindBuffer(GLES20.GL_ARRAY_BUFFER, vbo)
        GLES20.glBufferData(GLES20.GL_ARRAY_BUFFER, tri.size * 4, fb, GLES20.GL_STATIC_DRAW)
        play("Idle")
    }
    override fun onSurfaceChanged(width: Int, height: Int) { w = max(1, width); h = max(1, height) }
    override fun release() {
        pet.release()
        if (prog != 0) GLES20.glDeleteProgram(prog)
        if (vbo != 0) GLES20.glDeleteBuffers(1, intArrayOf(vbo), 0)
        prog = 0; vbo = 0
    }

    private fun play(name: String) {
        val c = pet.clips[name] ?: return
        if (c === cur) return
        from = cur; fromT = curT; fade = if (cur == null) 1f else 0f
        cur = c; curT = 0f
    }

    private val size get() = min(0.62f, halfW * 1.15f)
    private fun screenX(): Float = (px - pagePos) * 2f * halfW
    private fun hit(nx: Float, ny: Float): Boolean {
        val ux = (nx - 0.5f) * 2f * halfW; val uy = (0.5f - ny) * 2f * halfH
        return hypot(ux - screenX(), uy - y) < size * 0.6f
    }

    // ---------------------------------------------------------------- touch
    override fun touchDown(nx: Float, ny: Float): Boolean {
        down = true; dx = nx; dy = ny; lx = nx; ly = ny; downT = time; mvx = 0f; mvy = 0f; lastMoveT = time
        return hit(nx, ny)
    }
    override fun touchMove(nx: Float, ny: Float): Boolean {
        val dt = max(0.008f, time - lastMoveT)
        mvx = mvx * 0.5f + (nx - lx) / dt * 0.5f; mvy = mvy * 0.5f + (ny - ly) / dt * 0.5f
        lx = nx; ly = ny; lastMoveT = time
        return false
    }
    override fun touchUp(): Boolean {
        if (!down) return false
        down = false
        val dist = hypot(lx - dx, ly - dy)
        if (dist > 0.12f && time - downT < 0.6f && abs(mvx) > 0.6f) {
            // a swipe: fling him off sideways toward the next page
            vx = sign(mvx) * min(3.2f, 1.1f + abs(mvx) * 0.35f)
            vy += -mvy * 0.15f
            spinRate += sign(mvx) * 3f
            play("Flail"); boost(1.5f)
            if (!flung) { flung = true; listener?.onDiscovery("cosmo fling") }
            return true
        }
        return false
    }
    override fun tapAt(nx: Float, ny: Float): Boolean {
        boost(if (hit(nx, ny)) 3.2f else 2f)
        play(if (hit(nx, ny)) "Poke" else "Flail")
        val ux = (nx - 0.5f) * 2f * halfW
        vx += (screenX() - ux) * 0.4f
        return true
    }
    override fun longPressAt(nx: Float, ny: Float): Boolean { boost(4f); play("Flail"); return true }
    private fun boost(k: Float) {
        speed = min(9f, speed + k); spinRate += (if (Random.nextBoolean()) 1f else -1f) * k * 0.9f; shake = min(1f, shake + 0.25f * k)
    }

    override fun greet() { play("Wave") }
    override fun swiped(dir: Float, fast: Boolean) { if (fast) boost(1f) }
    override fun perform(trick: String): Boolean {
        when (trick) {
            "faster" -> { boost(5f); play("Flail") }
            "wave" -> play("Wave"); "curl" -> play("Curl"); "swim" -> play("Swim")
            "thumbs" -> play("ThumbsUp"); "relax" -> play("Relax")
            else -> return false
        }
        return true
    }

    // ---------------------------------------------------------------- update
    override fun update(dt: Float, input: SceneInput) {
        time += dt
        pagesKnown = abs(input.pagePos) > 0.001f || pagesKnown
        pagePos += (input.pagePos - pagePos) * min(1f, dt * 12f)
        // falling speed: calm 1, boosted by touches, decays back
        speed += (1f - speed) * min(1f, dt * 0.6f)
        if (input.audio.active) speed = max(speed, 1f + input.audio.bass * 2.5f)
        fall += speed * dt
        shake *= exp(-dt * 3f)
        // tumble
        spinRate += ((if (spinRate >= 0f) 0.35f else -0.35f) - spinRate) * min(1f, dt * 0.5f)
        val curl = cur?.name == "Curl" && curT in 0.5f..2.4f
        spin += spinRate * dt * (if (curl) 4f else 1f)
        yawPh += dt * (0.25f + speed * 0.05f)
        // drift: momentum, gentle pull back to the page centre when not flung
        px += vx * dt / (2f * halfW)
        vx *= exp(-dt * 0.9f)
        if (abs(vx) < 0.15f) {
            val home = Math.round(px - 0.0f).toFloat()
            px += (home - px) * min(1f, dt * 0.35f)
        }
        if (!pagesKnown) { if (px > 1.2f) px -= 1f; if (px < -0.2f) px += 1f }       // single page: wrap round
        else px = px.coerceIn(-0.4f, 6.4f)
        vy += (sin(time * 0.37f) * 0.08f - y) * dt * 0.8f; vy *= exp(-dt * 1.2f); y += vy * dt
        y = y.coerceIn(-halfH + size * 0.6f, halfH - size * 0.6f)
        // what he's doing
        val c = cur
        if (c != null) {
            curT += dt
            val done = !c.loop && curT > c.duration
            if (c.name == "Flail" && speed < 1.6f && abs(vx) < 0.5f) play("Idle")
            else if (done) play("Idle")
        }
        nextLife -= dt
        if (nextLife <= 0f && cur?.name == "Idle") {
            nextLife = 6f + Random.nextFloat() * 6f
            play(listOf("Wave", "Curl", "Swim", "ThumbsUp", "Relax", "Curl").random())
        }
        advance(dt)
    }

    private fun advance(dt: Float) {
        val c = cur ?: return
        pet.sample(c, if (c.loop) curT % max(0.01f, c.duration) else min(curT, c.duration), matA, ctl)
        val nb = pet.nBones * 12
        val f = from
        if (f != null && fade < 1f) {
            fade = min(1f, fade + dt / 0.3f); fromT += dt
            pet.sample(f, if (f.loop) fromT % max(0.01f, f.duration) else min(fromT, f.duration), matB, ctl)
            val a = fade * fade * (3f - 2f * fade)
            for (i in 0 until nb) pet.pose[i] = matB[i] + (matA[i] - matB[i]) * a
        } else System.arraycopy(matA, 0, pet.pose, 0, nb)
        pet.pivot = pet.boxCz
        pet.yaw = sin(yawPh) * 1.1f + time * 0.15f * sign(spinRate)
        pet.lean = sin(yawPh * 0.7f + 1f) * 0.5f
    }

    // ---------------------------------------------------------------- draw
    override fun draw(input: SceneInput) {
        GLES20.glDisable(GLES20.GL_BLEND)
        GLES20.glUseProgram(prog)
        GLES20.glBindBuffer(GLES20.GL_ARRAY_BUFFER, vbo)
        GLES20.glEnableVertexAttribArray(0); GLES20.glVertexAttribPointer(0, 2, GLES20.GL_FLOAT, false, 0, 0)
        GLES20.glUniform2f(su["uRes"]!!, w.toFloat(), h.toFloat())
        GLES20.glUniform2f(su["uHalf"]!!, halfW, halfH)
        GLES20.glUniform1f(su["uFall"]!!, fall % 1000f)
        GLES20.glUniform1f(su["uSpeed"]!!, speed)
        GLES20.glUniform1f(su["uTime"]!!, time % 1000f)
        GLES20.glUniform1f(su["uPar"]!!, pagePos)
        GLES20.glUniform1f(su["uShake"]!!, shake)
        GLES20.glDrawArrays(GLES20.GL_TRIANGLES, 0, 3)
        GLES20.glDisableVertexAttribArray(0)
        val m = min(w, h)
        val k = size / pet.height
        val boxHalf = pet.boxR * k
                pet.ensureSprite((boxHalf * 2f * m * 1.3f).toInt())
        pet.render()
        pet.beginFx()
        val sx = screenX() + (Random.nextFloat() - 0.5f) * shake * 0.02f
        pet.sprite(sx, y + (Random.nextFloat() - 0.5f) * shake * 0.02f, boxHalf, spin, 1f)
        pet.endFx()
    }

    companion object {
        private const val VERT = "attribute vec2 aPos;\nvoid main(){ gl_Position = vec4(aPos, 0.0, 1.0); }\n"
        // Deep space rushing upward: three layers of stars that stretch into streaks with speed,
        // drifting dust, a faint nebula, and now and then a planet sliding past far behind.
        private const val FRAG = """
precision highp float;
uniform vec2 uRes; uniform vec2 uHalf; uniform float uFall; uniform float uSpeed; uniform float uTime; uniform float uPar; uniform float uShake;
float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h21(i), h21(i + vec2(1.0, 0.0)), f.x), mix(h21(i + vec2(0.0, 1.0)), h21(i + vec2(1.0, 1.0)), f.x), f.y); }
float stars(vec2 p, float dens, float fallOff, float streak, float seed){
  vec2 q = p * dens; q.y -= fallOff * dens;
  vec2 id = floor(q); vec2 f = fract(q) - 0.5;
  float r = h21(id + seed);
  if (r < 0.86) return 0.0;
  vec2 o = (vec2(h21(id + seed + 3.1), h21(id + seed + 7.7)) - 0.5) * 0.7;
  vec2 d = f - o;
  d.y /= 1.0 + streak;                       // stretched along the fall
  float s = smoothstep(0.09, 0.0, length(d));
  return s * (0.4 + 0.6 * h21(id + seed + 1.3));
}
void main(){
  vec2 uv = gl_FragCoord.xy / uRes;
  vec2 p = (uv - 0.5) * uHalf * 2.0;
  p.x += uPar * 0.25;
  float sp = uSpeed;
  // nebula, very slow: soft violet and teal clouds
  vec2 np = p * 0.9 + vec2(0.0, -uFall * 0.02);
  float n = 0.0, amp = 0.5; vec2 q = np;
  for (int i = 0; i < 4; i++) { n += amp * noise(q); q = q * 2.03 + vec2(1.7, 9.2); amp *= 0.5; }
  float n2 = noise(np * 0.7 + vec2(5.0, 1.0));
  vec3 col = vec3(0.004, 0.003, 0.012);
  col += vec3(0.07, 0.025, 0.12) * smoothstep(0.35, 0.85, n) * smoothstep(0.3, 0.8, n2);
  col += vec3(0.0, 0.04, 0.07) * smoothstep(0.4, 0.9, n) * (1.0 - smoothstep(0.2, 0.7, n2));
  // a planet sliding past far behind, every ~40 s of fall
  float cyc = mod(uFall * 0.012, 1.0); float pid = floor(uFall * 0.012);
  vec2 pc = vec2((h21(vec2(pid, 3.0)) - 0.5) * uHalf.x * 1.4, mix(-uHalf.y - 0.6, uHalf.y + 0.6, cyc));
  float pr = 0.18 + 0.2 * h21(vec2(pid, 9.0));
  float pd = length(p - pc); float occ = 1.0;
  if (pd < pr * 1.4 && h21(vec2(pid, 1.0)) > 0.35) {
    vec3 pcol = mix(vec3(0.45, 0.3, 0.8), vec3(0.9, 0.55, 0.3), h21(vec2(pid, 5.0)));
    float lit = clamp(dot(normalize(vec3(p - pc, sqrt(max(0.0, pr * pr - pd * pd)))), normalize(vec3(-0.6, 0.5, 0.6))), 0.0, 1.0);
    float band = 0.85 + 0.15 * sin((p.y - pc.y) / pr * 12.0 + noise((p - pc) * 8.0) * 3.0);
    float disk = smoothstep(pr, pr - 0.004, pd);
    col = mix(col, pcol * (0.12 + 0.9 * lit) * band, disk); occ = 1.0 - disk;
    col += pcol * 0.25 * smoothstep(pr * 1.4, pr, pd) * (1.0 - disk);   // atmosphere glow
  }
  // star layers: far ones slow and round, near ones fast and streaky
  float st = 0.0;
  st += stars(p, 26.0, uFall * 0.05, sp * 0.05, 1.0) * 0.5;
  st += stars(p, 14.0, uFall * 0.12, sp * 0.25, 7.0) * 0.8;
  st += stars(p, 7.0, uFall * 0.3, sp * 0.9, 13.0) * 1.1;
  float tw = 0.8 + 0.2 * sin(uTime * 3.0 + p.x * 40.0);
  col += vec3(0.85, 0.9, 1.0) * st * tw * occ;
  // speed lines when falling hard
  float sl = smoothstep(2.5, 7.0, sp);
  if (sl > 0.0) {
    vec2 q = vec2(p.x * 40.0, p.y * 2.0 - uFall * 2.5);
    vec2 id = floor(q);
    float line = step(0.93, h21(vec2(id.x, floor(q.y * 0.5)))) * smoothstep(0.5, 0.0, abs(fract(q.x) - 0.5)) * fract(q.y * 0.5);
    col += vec3(0.6, 0.75, 1.0) * line * sl * 0.35;
  }
  col += vec3(0.25, 0.35, 0.6) * uShake * 0.08;
  gl_FragColor = vec4(col, 1.0);
}
"""
    }
}
