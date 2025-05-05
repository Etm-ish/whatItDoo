class TasksHandler {
    constructor () {
        this.activeTaskMap = new Map();
        this.doneTaskList = new Array();
    }

    addActiveTask(id, taskItem) {
        this.activeTaskMap.set(id, taskItem);
    }

    getActiveTaskCount() {
        return this.activeTaskMap.size;
    }

    getAllActiveTasks() {
        return this.activeTaskMap;
    }

    printStuff() {
        console.log(JSON.stringify(this.activeTaskMap));
    }
}
module.exports = TasksHandler;