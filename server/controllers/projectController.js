import prisma from "../configs/prisma.js";

//create a new project in a workspace
export const createProject = async (req, res) => {
    try {
        const {userId} = await req.auth();
        const {workspaceId, description, name, status, start_date, end_date, team_members, team_lead, progress, priority} = req.body;

        //if user has admin role for workspace 
        const workspace = await prisma.workspace.findUnique({
            where:{id: workspaceId},
            include:{members:{include:{user:true}}}
        })

        if(!workspace){
            return res.status(404).json({error: "Workspace not found"});
        }

        if(!workspace.members.some((member)=>member.userId===userId && member.role==="ADMIN")){
            return res.status(403).json({error: "Only admins can create projects"});
        }

        //get team lead user
        const teamLead = await prisma.user.findUnique(
            {where:{id: team_lead},
            select:{id:true}
        })

        const project = prisma.project.create({
            data:{
                workspaceId,
                name,
                description,
                status,
                priority,
                progress,
                team_lead: teamLead?.id,
                start_date: start_date ? new Date(start_date) : null,
                end_date: end_date ? new Date(end_date) : null,
            }
        })

        //add team members if in the workspace
        if(team_members?.length > 0){
            const membersToAdd = []
            workspace.members.forEach(()=>{
                if(team_members.includes(member.user.email)){
                    membersToAdd.push(member.user.id)
                }
            })

            await prisma.projectMember.createMany({
                data: membersToAdd.map((memberId)=>({
                    projectId: project.id,
                    userId: memberId,})
        )})
        }

        const projectWithMembers = await prisma.project.findUnique({
            where:{id: project.id},
            include:{members:{include:{user:true}},
        tasks:{include:{assignee:true, comments: {include:{user:true}}}},
        owner: true
    },

        })
res.json({project: projectWithMembers, message: "Project created successfully"});
        
    } catch (error) {
        console.error("Error creating project:", error);
        res.status(500).json({error: "Internal server error"}); 
    }
}

//update project
export const updateProject = async (req, res) => {
    try {
        const {userId} = await req.auth();
        const {projectId, description, name, status, start_date, end_date, team_members, team_lead, progress, priority} = req.body;

        //check if user has admin role for workspace
         const workspace = await prisma.workspace.findUnique({
            where:{id: workspaceId},
            include:{members:{include:{user:true}}}
        })

        if(!workspace){
            return res.status(404).json({error: "Workspace not found"});
        }

        if(!workspace.members.some((member)=>member.userId===userId && member.role==="ADMIN")){
            const project = await prisma.project.findUnique({
                where:{id: projectId},
            })

            if(!project){
                return res.status(404).json({error: "Project not found"});
            }
            else if(project.team_lead !== userId){
                return res.status(403).json({error: "Only admins and team leads can update projects"});
            }
            else{

            }
        }

        const project = await prisma.project.update({
            where:{id: projectId},
            data:{
                workspaceId,
                description,
                name,
                status,
                priority,
                progress,
                start_date: start_date ? new Date(start_date) : null,
                end_date: end_date ? new Date(end_date) : null,
            }
        })

        res.json({project, message: "Project updated successfully"});

    } catch (error) {
        console.error("Error updating project:", error);
        res.status(500).json({error: "Internal server error"}); 
    }
}

//add member to project
export const addMember = async (req, res) => {
    try {

        const {userId} = await req.auth();
        const {projectId} = req.params;
        const {email} = req.body;

        //check if user is project lead
        const project = await prisma.project.findUnique({
            where:{id: projectId},
            include:{members:{include:{user:true}}}
        })

        if(!project){
            return res.status(404).json({error: "Project not found"});
        }   

        if(project.team_lead !== userId){
            return res.status(403).json({error: "Only project team lead can add members"});
        }

        

        //if user is a member already
        const existingMember = project.members.find((member)=>member.email === email);
        if(existingMember){
            return res.status(400).json({error: "User is already a member of the project"});
        }

        const user = await prisma.user.findUnique({
            where:{email}
        });
        if(!user){
            return res.status(404).json({error: "User not found"});
        }

        const member = await prisma.projectMember.create({
            data:{
                userId: user.id,
                projectId,
            }
        })

        res.json({member, message: "Project member added successfully"});
        
    } catch (error) {
        console.error("Error adding project member:", error);
        res.status(500).json({error: "Internal server error"}); 
    }
}