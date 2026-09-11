from pydantic import BaseModel, ConfigDict


def to_camel(string: str) -> str:
    parts = string.split("_")
    return parts[0] + "".join(word.capitalize() for word in parts[1:])


class PipelineInitializationSchema(BaseModel):
    artifacts_bucket: str
    environment_id: str
    gcp_project_id: str
    pipeline_id: str
    region: str
    scheduler_service: str
    path: str

    class Config:
        alias_generator = to_camel
        allow_population_by_field_name = True