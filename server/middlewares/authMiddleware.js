export const protect = async (req, res, next) => {
    try {
        const { userId } = await req.auth();
        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        return next();
    } catch (error) {
        console.error("Authentication error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
}