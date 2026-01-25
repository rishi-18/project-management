import prisma from "../configs/prisma.js";

//get all workspaces for a user
export const getUserWorkspaces = async (req, res) => {
    try{
        const {userId} = await req.auth();
        const workspaces = await prisma.workspace.findMany({
            where: {
                members: {
                    some: {
                        userId: userId,
            }
        }
    },
        include: {
            members: {include: {user: true}},
            projects: {include:{tasks: {include: {assignee: true, comments:{include:{user:true}}}},
            members: {include: {user: true}}}
        },
        owner: true
        }
    });
    res.json({workspaces});
    }catch(err){
        console.error("Error fetching workspaces:", err);
        res.status(500).json({error: "Internal server error"});
    }
} 

//add member to workspace
export const addMember = async (req, res) => {
    try {
        const {userId} = await req.auth();
        const {email, role, workspaceId,message} = req.body;

        //check if user exists
        const user = await prisma.user.findUnique({where:{email}});
        if(!user){
            return res.status(404).json({error: "User not found"});
        }

        if(!workspaceId || !role){
            return res.status(400).json({error: "Workspace ID and role are required"});
        }

        // if(role !== "ADMIN" && role !== "MEMBER"){
        //     return res.status(400).json({error: "Invalid role specified"});
        // }
        if(!["ADMIN","MEMBER"].includes(role)){
            return res.status(400).json({error: "Invalid role specified"});
        }

        //fetch workspace
        const workspace = await prisma.workspace.findUnique({
            where:{id: workspaceId},include:{members:true}
        });

        if(!workspace){
            return res.status(404).json({error: "Workspace not found"});
        }

        //check if creator has admin role
        if(!workspace.members.find((member)=>member.userId===userId && member.role==="ADMIN")){
            return res.status(401).json({error: "Only admins can add members"});
        }
        // if(workspace.ownerId !== userId){
        //     return res.status(403).json({error: "Only workspace owner can add members"});
        // }

        //check if user is already a member
        const existingMember = workspace.members.find((member)=>member.userId===user.id);
        if(existingMember){
            return res.status(400).json({error: "User is already a member of the workspace"});
        }

        const member = await prisma.workspaceMember.create({
            data:{
                userId: user.id,
                workspaceId,
                role,
                message
            }
        })

        res.json({member, message: "Member added successfully"});


        //check if requester is admin of workspace
        const requesterMembership = await prisma.workspaceMember.findUnique({
            where:{
                userId_workspaceId:{
                    userId: userId,
                    workspaceId: workspaceId,
                }
            }
        });

    } catch (error) {
        console.error("Error adding member to workspace:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}