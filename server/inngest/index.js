import { Inngest } from "inngest";
import prisma from "../configs/prisma.js";
import sendEmail from "../configs/nodemailer.js";

// Create a client to send and receive events
export const inngest = new Inngest({ id: "my-app" });

const syncUserCreation = inngest.createFunction(
    { id: "sync-user-from-clerk" },
    { event: "clerk/user.created" },
    async ({ event}) => {
        // Function logic to sync user creation
        const{data}= event;
        await prisma.user.create({
            data:{
                id:data.id,
                email:data?.email_addresses[0]?.email_address,
                name:data?.first_name+" "+data?.last_name,
                image:data?.image_url,

            }
        })
        console.log("User created with data:", event.data);
    }
);

//inngest function to delete user from database when user is deleted from clerk
const syncUserDeletion = inngest.createFunction(
    {id: "delete-user-from-clerk"},
    {event: "clerk/user.deleted"},
    async({event})=>{
        const{data}= event;
        await prisma.user.delete({
            where:{
                id:data.id,
            }
        })
        console.log("User deleted with id:", data.id);
    }
)

//inngest function to update user from database when user is updated from clerk
const syncUserUpdation = inngest.createFunction(
    {id:"update-user-from-clerk"},
    {event: "clerk/user.updated"},
    async({event})=>{
        const {data}=event; 
        await prisma.user.update({
            where:{
                id:data.id,
            },
            data:{
                email:data?.email_addresses[0]?.email_address,
                name:data?.first_name+" "+data?.last_name,
                image:data?.image_url,
            }
        })
    }
)

//inngest function to save workspace data to database
const syncWorkspaceCreation = inngest.createFunction(
    {id: "sync-workspace-from-clerk"},
    {event: "clerk/organization.created"},
    async({event})=>{
        const{data}= event;
        await prisma.workspace.create({
            data:{
                id:data.id,
                name:data.name,
                slug:data.slug,
                ownerId:data.created_by,
                image_url:data.image_url,
            }
        })

        await prisma.workspaceMember.create({
            data:{
                userId:data.created_by, 
                workspaceId:data.id,
                role:"ADMIN",
            }
        })
        console.log("Workspace created with data:", event.data);
    }
)

//inngest function to update workspace data in database
const syncWorkspaceUpdation = inngest.createFunction(
    {id:"update-workspace-from-clerk"},
    {event: "clerk/organization.updated"},
    async({event})=>{
        const {data}=event;
        await prisma.workspace.update({
            where:{
                id:data.id,
            },
            data:{
                name:data.name,
                slug:data.slug,
                image_url:data.image_url,
            }
        })
    }
)

//inngest function to delete workspace data from database
const syncWorkspaceDeletion = inngest.createFunction(
    {id: "delete-workspace-from-clerk"},
    {event: "clerk/organization.deleted"},
    async({event})=>{
        const{data}= event;
        await prisma.workspace.delete({
            where:{
                id:data.id,
            },
        })
    }
)

//inngest function to save workspace member data to database
const syncWorkspaceMemberCreation = inngest.createFunction(
    {id: "sync-workspace-member-from-clerk"},
    {event: "clerk/organizationInvitation.accepted"},
    async({event})=>{
        const{data}= event;
        await prisma.workspaceMember.create({
            data:{
                userId:data.user_id,
                workspaceId:data.organization_id,
                role:String(data.role_name).toUpperCase(),
            }
        })
    }
)

//inngest function to send email on task assignment
const sendTaskAssignmentEmail = inngest.createFunction(
    {id: "send-task-assignment-email"},
    {event: "app/task.assigned"},
    async({event,step})=>{
        const {taskId,origin} = event.data;

        const task = await prisma.task.findUnique({
            where:{id: taskId},
            include:{assignee:true, project:true}
        })

        await sendEmail({
            to: task.assignee.email,
            subject: `New Task Assigned: ${task.project.name}`,
            body: `Hi ${task.assignee.name}, you have been assigned a new task: ${task.title} due on ${new Date(task.due_date).toLocaleDateString()}. Please check the project management app for more details.
                    <a href=${origin}></a>`,
        })

        if(new Date(task.due_date).toLocaleDateString() != new Date().toLocaleDateString()){
            await step.sleepUntil('wait-for-the-due-date', new Date(task.due_date));

            await step.run('check-if-task-is-completed',async()=>{
                const task = await prisma.task.findUnique({
                    where:{id: taskId},
                    include:{assignee:true, project:true}
                })

                if(!task) return;
                if(task.status !== "DONE"){
                    await step.run('send-task-reminder-email', async()=>{
                        await sendEmail({
                            to: task.assignee.email,
                            subject: `Task Reminder: ${task.project.name}`,
                            body: `Hi ${task.assignee.name}, this is a reminder that the task: ${task.title} is due today. Please make sure to complete it on time. Check the project management app for more details.
                                    <a href=${origin}></a>`,
                        })
                    })
                }
            })
        }
    }
)

// Create an empty array where we'll export future Inngest functions
export const functions = [
    syncUserCreation,
    syncUserDeletion,
    syncUserUpdation,
    syncWorkspaceCreation,
    syncWorkspaceUpdation,
    syncWorkspaceDeletion,
    syncWorkspaceMemberCreation,
    sendTaskAssignmentEmail,
];