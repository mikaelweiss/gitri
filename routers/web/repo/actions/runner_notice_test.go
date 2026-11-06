// Copyright 2026 The Gitea Authors. All rights reserved.
// SPDX-License-Identifier: MIT

package actions

import (
	"testing"

	actions_model "gitea.dev/models/actions"

	"github.com/stretchr/testify/assert"
)

func TestFindRunnerlessJobs(t *testing.T) {
	waiting := &actions_model.ActionRunJob{ID: 1, Status: actions_model.StatusWaiting, RunsOn: []string{"ubuntu-latest"}}
	unmatched := &actions_model.ActionRunJob{ID: 2, Status: actions_model.StatusWaiting, RunsOn: []string{"macos-latest"}}
	running := &actions_model.ActionRunJob{ID: 3, Status: actions_model.StatusRunning, RunsOn: []string{"macos-latest"}}
	caller := &actions_model.ActionRunJob{ID: 4, Status: actions_model.StatusWaiting, IsReusableCaller: true}
	jobs := []*actions_model.ActionRunJob{waiting, unmatched, running, caller}

	assert.Equal(t, []*actions_model.ActionRunJob{waiting, unmatched}, findRunnerlessJobs(jobs, nil))

	runners := []*actions_model.ActionRunner{{AgentLabels: []string{"ubuntu-latest"}}}
	assert.Equal(t, []*actions_model.ActionRunJob{unmatched}, findRunnerlessJobs(jobs, runners))
}

func TestJoinRunnerLabels(t *testing.T) {
	jobs := []*actions_model.ActionRunJob{
		{RunsOn: []string{"ubuntu-latest", "docker"}},
		{RunsOn: []string{"docker"}},
	}
	assert.Equal(t, "docker, ubuntu-latest", joinRunnerLabels(jobs))
}
