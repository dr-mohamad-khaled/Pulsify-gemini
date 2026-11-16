package app.pulsify.engine

/** What the app screens need to know about each creature (id 1, 2, ...). */
data class CoatInfo(val name: String, val base: Int, val rim: Int)

/** An environment: a painted world id, or -1 for the night-sky shader with a given variant. */
data class EnvInfo(val name: String, val world: Int, val skyVariant: Int = 0, val c1: Int, val c2: Int)

/** World id for a plain background in a colour the user picks (true black by default). */
const val SOLID_WORLD = 100

/** Background colours offered for [SOLID_WORLD]. */
val SOLID_COLORS = listOf(
    0xFF000000.toInt(), 0xFF0B1026.toInt(), 0xFF1A0B24.toInt(), 0xFF06201C.toInt(),
    0xFF1F1F24.toInt(), 0xFF2A0A14.toInt(), 0xFF2B1E0A.toInt(), 0xFFF6EFE6.toInt(),
)

/** Photo worlds (four times of day, depth parallax, living layers). Only the ones whose pictures ship are offered. */
val P_BACKYARD = EnvInfo("Backyard", 40, c1 = 0xFF5FB2FF.toInt(), c2 = 0xFF4CAF50.toInt())
val P_SNOWCABIN = EnvInfo("Snowy Cabin", 41, c1 = 0xFFDDEBFF.toInt(), c2 = 0xFF2E6B5B.toInt())
val P_LIVING = EnvInfo("Living Room", 42, c1 = 0xFFE0A070.toInt(), c2 = 0xFF8E3A50.toInt())
val P_ROOFTOP = EnvInfo("Rooftop Garden", 43, c1 = 0xFF1F2A44.toInt(), c2 = 0xFFFFC56B.toInt())
val P_RAINFOREST = EnvInfo("Rainforest", 44, c1 = 0xFF2E7D4F.toInt(), c2 = 0xFFB8F27A.toInt())
val P_BEACH = EnvInfo("Tropical Beach", 45, c1 = 0xFF3FC1FF.toInt(), c2 = 0xFFFFC46B.toInt())
val P_POND = EnvInfo("Pond Meadow", 46, c1 = 0xFF7ED957.toInt(), c2 = 0xFF5FB2FF.toInt())
val P_BLOSSOM = EnvInfo("Blossom Garden", 47, c1 = 0xFFFFB7D5.toInt(), c2 = 0xFF8C6CE6.toInt())
val P_AUTUMN = EnvInfo("Autumn Forest", 48, c1 = 0xFFE8A33A.toInt(), c2 = 0xFF6E4A30.toInt())
val P_PARK = EnvInfo("City Park", 49, c1 = 0xFF7EC8FF.toInt(), c2 = 0xFF5FB04F.toInt())
val P_WORKSHOP = EnvInfo("Workshop", 50, c1 = 0xFF2DD4BF.toInt(), c2 = 0xFFFFB36B.toInt())
val P_MOONBASE = EnvInfo("Moon Base", 51, c1 = 0xFF8A93AE.toInt(), c2 = 0xFF59B8FF.toInt())
val P_GRAVEYARD = EnvInfo("Spooky Graveyard", 52, c1 = 0xFF3D2E6B.toInt(), c2 = 0xFFFFBF4D.toInt())
val P_PUMPKIN = EnvInfo("Pumpkin Patch", 53, c1 = 0xFFFF8C1A.toInt(), c2 = 0xFF6E4A30.toInt())
val P_REEF = EnvInfo("Coral Reef", 54, c1 = 0xFF1FA6C7.toInt(), c2 = 0xFFFF8099.toInt())
val P_SHIP = EnvInfo("Sunken Ship", 55, c1 = 0xFF14666B.toInt(), c2 = 0xFFFFD159.toInt())
val P_CANDY = EnvInfo("Candy Land", 56, c1 = 0xFFFFB3D9.toInt(), c2 = 0xFF8EF2D0.toInt())
val P_CLOUD = EnvInfo("Cloud Nursery", 57, c1 = 0xFFF5A8D8.toInt(), c2 = 0xFF8C7AE6.toInt())
val P_SAVANNA = EnvInfo("Savanna", 58, c1 = 0xFFE8B04A.toInt(), c2 = 0xFF6E8A3A.toInt())
val P_WATERHOLE = EnvInfo("Watering Hole", 59, c1 = 0xFF59B8FF.toInt(), c2 = 0xFFE8B04A.toInt())

/** New photo worlds first; the old low-horizon pictures only stay until at least two new ones are ready. */
fun worlds(photo: List<EnvInfo>, old: List<EnvInfo>, keep: List<EnvInfo> = emptyList()): List<EnvInfo> {
    val ready = photo.filter { it.world in PHOTO_READY }
    return ready + (if (ready.size < 2) old.filter { o -> ready.none { it.name == o.name } } else emptyList()) + keep
}

/** A trick the Studio can ask the creature to do right now. */
data class TrickInfo(val id: String, val label: String, val emoji: String)

data class CreatureInfo(
    val id: Int,
    val name: String,
    val line: String,
    val hint: String,
    val accent: Int,
    val coats: List<CoatInfo>,
    val envs: List<EnvInfo>,
    val tricks: List<TrickInfo> = emptyList(),
    /** Looks the user can pick between (empty: just one). */
    val styles: List<String> = emptyList(),
)

val GLOWY_INFO = CreatureInfo(
    5, "Glowy", "Anglerfish, clownfish, betta, puffer or koi. Follows your finger.",
    "Drag: the lure follows you. Touch the water: little fish gather and it gulps them. Tap: the lure flashes.",
    0xFF80F2FF.toInt(), GLOWY_COATS.map { CoatInfo(it.name, it.body, it.glow) },
    worlds(listOf(P_REEF, P_SHIP), listOf(
        EnvInfo("Coral Garden", 13, c1 = 0xFF1FA6C7.toInt(), c2 = 0xFFFF8099.toInt()),
        EnvInfo("Sunken Ship", 14, c1 = 0xFF14666B.toInt(), c2 = 0xFFFFD159.toInt()),
    ), listOf(EnvInfo("Midnight Trench", 12, c1 = 0xFF0A1F4D.toInt(), c2 = 0xFF4DE6FF.toInt()))),
    listOf(
        TrickInfo("feed", "Feed", "🐟"), TrickInfo("flash", "Flash the lure", "💡"), TrickInfo("puff", "Puff up", "🐡"),
        TrickInfo("loop", "Loop", "🌀"), TrickInfo("bubbles", "Bubbles", "🫧"), TrickInfo("yawn", "Big yawn", "🥱"),
        TrickInfo("stare", "Chase the lure", "👀"),
    ),
)

val GROMBLE_INFO = CreatureInfo(
    6, "Gromble", "Tries very hard to be evil. Fails adorably.",
    "Finger far away: he growls. Finger close: he panics. Poke him three times. Hold him: secretly loves it.",
    0xFFB380FF.toInt(), GROMBLE_COATS.map { CoatInfo(it.name, it.fur, it.horn) },
    worlds(listOf(P_GRAVEYARD, P_PUMPKIN), listOf(
        EnvInfo("Lava Lair", 15, c1 = 0xFF4D0D0D.toInt(), c2 = 0xFFFF8C1A.toInt()),
        EnvInfo("Haunted Hill", 16, c1 = 0xFF3D2E6B.toInt(), c2 = 0xFFFFBF4D.toInt()),
        EnvInfo("Evil HQ", 17, c1 = 0xFF5C3D8C.toInt(), c2 = 0xFF99FF59.toInt()),
    )),
    listOf(
        TrickInfo("laugh", "Evil laugh", "😈"), TrickInfo("plan", "Evil plan", "📜"), TrickInfo("fire", "Fireball", "🔥"),
        TrickInfo("fly", "Fly", "🦇"), TrickInfo("boo", "BOO!", "👻"), TrickInfo("cape", "Cape swish", "🧛"),
        TrickInfo("attack", "Attack!", "💥"), TrickInfo("pet", "Pet him", "🫶"),
    ),
    styles = listOf("Doodle", "Reaper"),
)

val NUTTY_INFO = CreatureInfo(
    7, "Nutty", "Twitchy red squirrel. Always one second from panicking.",
    "Tap: it freezes and puffs up. Drag: it hops after you. Hold: offer an acorn and watch it run off to bury it.",
    0xFFF2AC6A.toInt(), NUTTY_COATS.map { CoatInfo(it.name, it.fur, it.light) },
    worlds(listOf(P_AUTUMN, P_PARK, P_SNOWCABIN), listOf(
        EnvInfo("Autumn Oak", 18, c1 = 0xFFE8A33A.toInt(), c2 = 0xFF6E4A30.toInt()),
        EnvInfo("City Park", 19, c1 = 0xFF7EC8FF.toInt(), c2 = 0xFF5FB04F.toInt()),
        EnvInfo("Snowy Pines", 20, c1 = 0xFFDDEBFF.toInt(), c2 = 0xFF2E6B5B.toInt()),
    )),
    listOf(
        TrickInfo("nibble", "Nibble", "🌰"), TrickInfo("stash", "Bury a nut", "🕳️"), TrickInfo("lookout", "Lookout", "👀"),
        TrickInfo("flick", "Tail flick", "🐿️"), TrickInfo("zoom", "Zoomies", "💨"), TrickInfo("catch", "Catch!", "🫴"),
        TrickInfo("spin", "Spin", "🌀"), TrickInfo("scratch", "Scratch", "🦶"), TrickInfo("feed", "Give an acorn", "🎁"),
        TrickInfo("drum", "Drum solo", "🥁"),
    ),
)

val BOLT_INFO = CreatureInfo(
    8, "Bolt", "Pocket robot. Runs on your battery. TV face shows how it feels.",
    "Tap its face: new expression (tap fast and it overheats). Hold near it: it scans your finger.",
    0xFF2DD4BF.toInt(), BOLT_COATS.map { CoatInfo(it.name, it.body, it.screen) },
    worlds(listOf(P_WORKSHOP, P_MOONBASE, P_LIVING), listOf(
        EnvInfo("Workshop", 21, c1 = 0xFF2DD4BF.toInt(), c2 = 0xFFFFB36B.toInt()),
        EnvInfo("Arcade", 22, c1 = 0xFF9D4EDD.toInt(), c2 = 0xFF2DD4BF.toInt()),
        EnvInfo("Moon Base", 23, c1 = 0xFF8A93AE.toInt(), c2 = 0xFF59B8FF.toInt()),
    )),
    listOf(
        TrickInfo("clock", "What time?", "⏰"), TrickInfo("wave", "Wave", "👋"), TrickInfo("dance", "The robot", "🤖"),
        TrickInfo("polish", "Polish screen", "✨"), TrickInfo("glitch", "Glitch", "📺"), TrickInfo("tune", "Tune antenna", "📡"),
        TrickInfo("radar", "Radar", "🛰️"), TrickInfo("jump", "Jump", "⬆️"), TrickInfo("scan", "Scan", "🔍"),
        TrickInfo("faces", "Faces", "😎"),
    ),
    styles = listOf("Doodle", "Nimbus"),
)

val GLOOP_INFO = CreatureInfo(
    9, "Gloop Gang", "A crew of jelly blobs with their own games. Pick how many.",
    "Tap one: squish. Drag one and fling it into the others. Hold the screen: they all come over.",
    0xFF8EE03B.toInt(),
    GLOOP_SIZES.mapIndexed { i, n -> CoatInfo(if (n == 8) "Full gang" else "$n blobs", GLOOP_TRAITS[i * 2 % GLOOP_TRAITS.size].base, GLOOP_TRAITS[(i * 2 + 1) % GLOOP_TRAITS.size].base) },
    listOf(
        EnvInfo("Jelly Room", 28, c1 = 0xFFC9A6FF.toInt(), c2 = 0xFFFFD6F2.toInt()),
        EnvInfo("Gum Pool", 29, c1 = 0xFF73F2C8.toInt(), c2 = 0xFFFFC6DA.toInt()),
        EnvInfo("Moon Jelly", 30, c1 = 0xFF9D5CF2.toInt(), c2 = 0xFFFFE6FA.toInt()),
        EnvInfo("Sherbet Hills", 31, c1 = 0xFFFFB38F.toInt(), c2 = 0xFFFF9EB8.toInt()),
        EnvInfo("Plain Colour", SOLID_WORLD, c1 = 0xFF000000.toInt(), c2 = 0xFF111111.toInt()),
    ).let { listOf(P_CANDY, P_CLOUD).filter { p -> p.world in PHOTO_READY } + it },
    listOf(
        TrickInfo("tag", "Tag", "🏃"), TrickInfo("tower", "Jelly tower", "🗼"), TrickInfo("conga", "Conga line", "💃"),
        TrickInfo("peekaboo", "Peekaboo", "🙈"), TrickInfo("bounce", "Bounce", "🔴"), TrickInfo("wave", "Mexican wave", "🌊"),
        TrickInfo("squish", "Squish all", "🫠"),
    ),
)

val SNOWY_INFO = CreatureInfo(
    SNOWY_ID, "Snowy", "Fluffy duckling. Quacks at everything, dreams of flying.",
    "Tap: quack-poke. Hold: cuddles. Rub: giggles. Drag to carry. Tap a widget and it hops on top.",
    0xFFFFB45C.toInt(), listOf(CoatInfo("Snow white", 0xFFF5F2EA.toInt(), 0xFFFF9A3C.toInt())),
    worlds(listOf(P_POND, P_BLOSSOM, P_BACKYARD), listOf(
        EnvInfo("Snow Day", 4, c1 = 0xFFDDEBFF.toInt(), c2 = 0xFF2E7D6B.toInt()),
        EnvInfo("Blossom Garden", 11, c1 = 0xFFFFB7D5.toInt(), c2 = 0xFF8C6CE6.toInt()),
    ), listOf(EnvInfo("Plain Colour", SOLID_WORLD, c1 = 0xFF000000.toInt(), c2 = 0xFF111111.toInt()))),
    listOf(
        TrickInfo("quack", "Quack", "🦆"), TrickInfo("flap", "Flap", "🪽"), TrickInfo("fly", "Try to fly", "✈️"),
        TrickInfo("preen", "Preen", "✨"), TrickInfo("crumbs", "Bread crumbs", "🍞"), TrickInfo("splash", "Puddle", "💦"),
        TrickInfo("toy", "Rubber duck", "🐤"), TrickInfo("butterfly", "Butterfly", "🦋"), TrickInfo("sleep", "Nap", "💤"),
    ),
)

val CREATURES: List<CreatureInfo> by lazy { BASE_CREATURES + KIWI_INFO + GLOWY_INFO + GROMBLE_INFO + NUTTY_INFO + BOLT_INFO + GLOOP_INFO + SNOWY_INFO }

/** Creatures that can also live in a home-screen widget (the 2D friends). */
val BUDDY_CREATURES: List<CreatureInfo> by lazy { CREATURES.filter { it.id != SNOWY_ID } }

private val BASE_CREATURES = listOf(
    CreatureInfo(
        1, "Mochi", "Battery-juice bean. Don't take its jar.",
        "Tap Mochi. Hold it. Try stealing its jar while you charge.",
        0xFF7CF2A8.toInt(), MOCHI_COATS.map { CoatInfo(it.name, it.base, it.rim) },
        worlds(listOf(P_CANDY, P_CLOUD), listOf(
            EnvInfo("Cloud Nursery", 1, c1 = 0xFFF5A8D8.toInt(), c2 = 0xFF8C7AE6.toInt()),
            EnvInfo("Battery Lab", 2, c1 = 0xFF4ADE80.toInt(), c2 = 0xFF1B2430.toInt()),
        ), listOf(EnvInfo("Candy Cosmos", -1, 0, 0xFF5BF09A.toInt(), 0xFFC9A6FF.toInt()))),
        listOf(TrickInfo("hello", "Say hi", "👋"), TrickInfo("bubble", "Blow a bubble", "🫧"), TrickInfo("star", "Catch a star", "⭐"), TrickInfo("bird", "Bird visit", "🐦"), TrickInfo("party", "Party", "🎉"), TrickInfo("wobble", "Wobble", "🍮"), TrickInfo("giggle", "Giggle", "😆"), TrickInfo("stretch", "Big stretch", "🙆")),
    ),
    CreatureInfo(
        2, "Kalboob", "Golden pup. Will fetch anything.",
        "Pet Kalboob. Hold for belly rubs. Hold the ground to throw a ball.",
        0xFFFFC46B.toInt(), PUP_COATS.map { CoatInfo(it.name, it.fur, it.collar) },
        worlds(listOf(P_BACKYARD, P_SNOWCABIN, P_LIVING), listOf(
            EnvInfo("Snow Day", 4, c1 = 0xFFDDEBFF.toInt(), c2 = 0xFF2E7D6B.toInt()),
            EnvInfo("Cozy Room", 5, c1 = 0xFFE0A070.toInt(), c2 = 0xFF8E3A50.toInt()),
        )),
        listOf(TrickInfo("fetch", "Fetch", "🎾"), TrickInfo("paw", "Give paw", "🐾"), TrickInfo("belly", "Belly rub", "🫶"), TrickInfo("dig", "Dig", "🕳️"), TrickInfo("howl", "Howl", "🌕"), TrickInfo("butterfly", "Butterfly", "🦋"), TrickInfo("zoomies", "Zoomies", "💨"), TrickInfo("yawn", "Yawn", "🥱")),
        styles = listOf("Doodle", "Blizzard"),
    ),
    CreatureInfo(
        3, "Kitty", "Curious, aloof, a little dramatic.",
        "Drag a finger: laser dot. Hold Kitty to make it purr.",
        0xFF8FC7FF.toInt(), KITTY_COATS.map { CoatInfo(it.name, it.fur, it.eye) },
        worlds(listOf(P_LIVING, P_ROOFTOP, P_BLOSSOM), listOf(
            EnvInfo("Windowsill", 6, c1 = 0xFF8FC7FF.toInt(), c2 = 0xFFE9EEF5.toInt()),
            EnvInfo("Rooftop", 7, c1 = 0xFF1F2A44.toInt(), c2 = 0xFFFFC56B.toInt()),
            EnvInfo("Box Fort", 8, c1 = 0xFFD9A066.toInt(), c2 = 0xFFF06292.toInt()),
        )),
        listOf(TrickInfo("pounce", "Pounce", "🎯"), TrickInfo("knock", "Knock the cup", "☕"), TrickInfo("cucumber", "Cucumber!", "🥒"), TrickInfo("box", "If it fits", "📦"), TrickInfo("zoomies", "Zoomies", "💨"), TrickInfo("purr", "Purr", "💜"), TrickInfo("groom", "Groom", "👅"), TrickInfo("loaf", "Loaf", "🍞"), TrickInfo("trill", "Trill", "🎶"), TrickInfo("stretch", "Stretch", "🙆")),
        styles = listOf("Doodle", "Snowball"),
    ),
)

val KIWI_INFO = CreatureInfo(
    4, "Kiwi", "Talks, whistles, headbangs. Teach it words.",
    "Drag: it steps to your finger. Tap it: squawk. Hold the sky: a seed. Tap a rhythm: it copies you.",
    0xFF7BE08A.toInt(), KIWI_SPECIES.map { CoatInfo(it.name, it.body, it.face) },
    worlds(listOf(P_RAINFOREST, P_BEACH, P_BLOSSOM), listOf(
        EnvInfo("Rainforest", 9, c1 = 0xFF2E7D4F.toInt(), c2 = 0xFFB8F27A.toInt()),
        EnvInfo("Palm Beach", 10, c1 = 0xFF3FC1FF.toInt(), c2 = 0xFFFFC46B.toInt()),
        EnvInfo("Blossom Garden", 11, c1 = 0xFFFFB7D5.toInt(), c2 = 0xFF8C6CE6.toInt()),
    )),
    listOf(
        TrickInfo("kiss", "Kiss the screen", "💋"),
        TrickInfo("talk", "Say something", "💬"), TrickInfo("whistle", "Whistle", "🎵"), TrickInfo("dance", "Headbang", "🤘"),
        TrickInfo("fly", "Fly a lap", "🪽"), TrickInfo("hang", "Upside-down", "🙃"), TrickInfo("seed", "Give a seed", "🌻"),
        TrickInfo("squawk", "Squawk!", "📢"), TrickInfo("preen", "Preen", "✨"), TrickInfo("oneleg", "One leg", "🦩"),
        TrickInfo("stretch", "Wing stretch", "🙆"),
    ),
)

fun creatureInfo(id: Int): CreatureInfo? = CREATURES.firstOrNull { it.id == id }
