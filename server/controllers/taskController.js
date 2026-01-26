import prisma from "../configs/prisma.js";
import { inngest } from "../inngest/index.js";

//create task
export const createTask = async (req, res) => {
  try {
    const { userId } = await req.auth();
    const {
      projectId,
      title,
      description,
      type,
      status,
      priority,
      assigneeId,
      due_date,
    } = req.body;
    const origin = req.get("origin");

    //check if user has admin role for project
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { workspace: { include: { owner: true } },members : true },
      
    });

    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    } else if (project.team_lead !== userId) {
      return res.status(403).json({ error: "Only team lead can create tasks" });
    } else if (
      assigneeId &&
      !project.members.find((member) => member.userId === assigneeId)
    ) {
      return res
        .status(400)
        .json({ error: "Assignee must be a member of the project" });
    }

    const task = await prisma.task.create({
      data: {
        projectId,
        title,
        description,
        status,
        priority,
        assigneeId,
        type,
        due_date: new Date(due_date),
      },
    });

    const taskWithAssignee = await prisma.task.findUnique({
      where: { id: task.id },
      include: { assignee: true },
    });

    await inngest.send({
        name: "app/task.assigned",
        data: {
            taskId: task.id,
            origin,
        },
    })

    res.json({ task: taskWithAssignee, message: "Task created successfully" });
  } catch (error) {
    console.error("Error creating task:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

//update task
export const updateTask = async (req, res) => {
  try {
    const task = await prisma.task.findUnique({
      where: { id: req.params.id },
    });

    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }

    const { userId } = await req.auth();

    const project = await prisma.project.findUnique({
      where: { id: task.projectId },
      include: { members: { include: { user: true } } },
    });

    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    } else if (project.team_lead !== userId) {
      return res.status(403).json({ error: "Only team lead can update tasks" });
    }

    const updatedTask = await prisma.task.update({
      where: { id: req.params.id },
      data: req.body,
    });

    res.json({ task: updatedTask, message: "Task updated successfully" });
  } catch (error) {
    console.error("Error updating task:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

//delete task
export const deleteTask = async (req, res) => {
  try {

    const { userId } = await req.auth();
    const {tasksIds} = req.body;

    const task = await prisma.task.findMany({
        where: { id: { in: tasksIds } },
    })

    if(task.length===0){
        return res.status(404).json({ error: "Tasks not found" });
    }

    const project = await prisma.project.findUnique({
      where: { id: task[0].projectId },
      include: { members: { include: { user: true } } },
    });

    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    } else if (project.team_lead !== userId) {
      return res.status(403).json({ error: "Only team lead can delete tasks" });
    }

    await prisma.task.deleteMany({
      where: { id: {in: tasksIds} },
    });

    res.json("Task deleted successfully" );
  } catch (error) {
    console.error("Error updating task:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
