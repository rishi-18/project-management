import { Inngest } from "inngest";
import prisma from "../configs/prisma.js";

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

// Create an empty array where we'll export future Inngest functions
export const functions = [
    syncUserCreation,
    syncUserDeletion,
    syncUserUpdation
];