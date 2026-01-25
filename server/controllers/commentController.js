import prisma from "../configs/prisma.js";
//add comment
export const addComment = async (req, res) => {
    try {
        const { userId } = await req.auth();
        const { taskId, content } = req.body;

        //check if task exists
        const task = await prisma.task.findUnique({
            where: { id: taskId },
        });

        const project = await prisma.project.findUnique({
            where: { id: task.projectId },
            include: { members: { include: { user: true } } },
        })

        if(!project){
            return res.status(404).json({ error: "Project not found" });
        }

        const member = project.members.find((member) => member.userId === userId);
        if (!member) {
            return res.status(403).json({ error: "Only project members can add comments" });
        }

        const comment = await prisma.comment.create({
            data: {
                taskId,
                userId,
                content,
            },
            include: { user: true }
        })

        res.json({ comment, message: "Comment added successfully" });

    } catch (error) {
        console.error("Error adding comment:", error);
        res.status(500).json({error: "Internal server error"});
    }
}

//get comments for task
export const getTaskComments = async (req, res) => {
    try {
        const {taskId} = req.params;
        const comments = await prisma.comment.findMany({
            where:{taskId},
            include:{user:true},
            // orderBy:{createdAt:'asc'}
        })
        res.json({comments})
    } catch (error) {
        console.error("Error fetching comments:", error);
        res.status(500).json({error: "Internal server error"});
    }
}